import { Elysia, t } from 'elysia';
import { cors } from '@elysiajs/cors';
import { GoogleGenAI, Schema, Type } from "@google/genai";

// --- CONFIGURATION ---
const PORT = 3000;
// In production, use process.env.API_KEY
const GENAI_API_KEY = process.env.API_KEY || "YOUR_GEMINI_API_KEY"; 

// --- TYPES ---
interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: 'Food' | 'Transport' | 'Shopping' | 'Utilities' | 'Subscription' | 'Other';
  summary: string;
}

// --- DATABASE (Mock In-Memory for this file, replace with SQLite/Postgres) ---
const db = {
  transactions: [] as Transaction[],
};

// --- GEMINI SETUP ---
const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

const transactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchant: { type: Type.STRING },
    amount: { type: Type.NUMBER },
    currency: { type: Type.STRING },
    date: { type: Type.STRING },
    category: { 
      type: Type.STRING, 
      enum: ['Food', 'Transport', 'Shopping', 'Utilities', 'Subscription', 'Other'] 
    },
    summary: { type: Type.STRING }
  },
  required: ["merchant", "amount", "currency", "date", "category", "summary"]
};

// --- HELPER FUNCTIONS ---
const decodeBase64 = (data: string) => {
    return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
};

const getBodyFromPayload = (payload: any): string => {
  let body = "";
  if (payload.body && payload.body.data) {
    body = decodeBase64(payload.body.data);
  } else if (payload.parts) {
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (textPart?.body?.data) body = decodeBase64(textPart.body.data);
    else if (htmlPart?.body?.data) body = decodeBase64(htmlPart.body.data).replace(/<[^>]*>?/gm, ''); 
    else if (payload.parts[0]) return getBodyFromPayload(payload.parts[0]);
  }
  return body;
};

// --- SERVER ---
const app = new Elysia()
  .use(cors())
  
  // 1. Get All Expenses
  .get('/expenses', () => {
    return { success: true, data: db.transactions };
  })

  // 2. Edit Expense
  .put('/expenses/:id', ({ params, body }) => {
    const idx = db.transactions.findIndex(t => t.id === params.id);
    if (idx === -1) return { success: false, error: "Not found" };
    
    const updated = { ...db.transactions[idx], ...(body as Partial<Transaction>) };
    db.transactions[idx] = updated;
    return { success: true, data: updated };
  })

  // 3. Scan Inbox (The Core Feature)
  .post('/expenses/scan', async ({ body, error }) => {
    const { accessToken } = body as { accessToken: string };

    if (!accessToken) return error(401, "Access Token required");

    try {
      // A. Fetch from Gmail
      const listRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=subject:(receipt OR order OR invoice)`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const listData = await listRes.json();
      const messages = (listData as any).messages || [];

      if (messages.length === 0) return { success: true, data: [], message: "No emails found" };

      const newTransactions: Transaction[] = [];

      // B. Process Emails
      for (const msg of messages) {
        // Check if we already processed this ID (Idempotency)
        // if (db.processedEmailIds.has(msg.id)) continue; 

        const detailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        const detail = await detailRes.json();
        const emailBody = getBodyFromPayload(detail.payload);

        // C. Gemini Extraction
        const geminiRes = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: `Analyze this email. If it's a receipt/invoice, extract details. If not, return null. content: ${emailBody}`,
          config: {
            responseMimeType: "application/json",
            responseSchema: transactionSchema,
          },
        });

        const text = geminiRes.text;
        if (text) {
          const data = JSON.parse(text);
          const transaction: Transaction = {
            id: Math.random().toString(36).substring(7), // In real DB, use UUID or Auto-inc
            ...data
          };
          newTransactions.push(transaction);
          db.transactions.push(transaction);
        }
      }

      return { success: true, data: newTransactions };

    } catch (e) {
      console.error(e);
      return error(500, "Failed to process emails");
    }
  })

  .listen(PORT);

console.log(`Backend running at http://localhost:${PORT}`);
