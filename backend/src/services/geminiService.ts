import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Transaction } from "../types";

const GENAI_API_KEY = process.env.API_KEY || process.env.GEMINI_API_KEY || "";

if (!GENAI_API_KEY) {
  console.warn(
    "Warning: GEMINI_API_KEY not set. Gemini features will not work."
  );
}

const ai = new GoogleGenAI({ apiKey: GENAI_API_KEY });

const transactionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    merchant: {
      type: Type.STRING,
      description: "Name of the merchant or service provider",
    },
    amount: { type: Type.NUMBER, description: "Total transaction amount" },
    currency: {
      type: Type.STRING,
      description: "Currency code (e.g., USD, EUR)",
    },
    date: {
      type: Type.STRING,
      description: "Date of transaction in YYYY-MM-DD format",
    },
    category: {
      type: Type.STRING,
      enum: [
        "Food",
        "Transport",
        "Shopping",
        "Utilities",
        "Subscription",
        "Other",
      ],
      description: "Category of the expense",
    },
    summary: {
      type: Type.STRING,
      description: "Short description of items purchased (max 5 words)",
    },
  },
  required: ["merchant", "amount", "currency", "date", "category", "summary"],
};

export const extractTransactionFromEmail = async (
  emailBody: string
): Promise<Transaction | null> => {
  try {
    console.log("GENAI_API_KEY", GENAI_API_KEY);
    console.log("API_KEY", process.env.API_KEY);
    console.log("GEMINI_API_KEY", process.env.GEMINI_API_KEY);
    if (!GENAI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }
    ai.models
      .list()
      .then((models) => {
        console.log("Models:", models);
      })
      .catch((error) => {
        console.error("Error listing models:", error);
      });
    const response = await ai.models.generateContent({
      model: "models/gemini-2.5-flash-lite",
      // model: "models/gemini-1.5-flash-8b",
      contents: `Analyze the following email content. If it contains a financial transaction (receipt, invoice, payment confirmation), extract the details. If it is NOT a transaction, return null. 
      
      Email Content:
      """
      ${emailBody}
      """`,
      config: {
        responseMimeType: "application/json",
        responseSchema: transactionSchema,
        systemInstruction:
          "You are a specialized financial parser. You extract precise data from unstructured email text.",
      },
    });

    const text = response.text;
    if (!text) return null;

    const data = JSON.parse(text);

    // Add a random ID for frontend keying
    return {
      ...data,
      id: Math.random().toString(36).substring(7),
    };
  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error(
      `Failed to extract transaction from email: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

/**
 * For Demo Mode: Generates fake receipt emails using Gemini
 */
export const generateDemoEmails = async (): Promise<string[]> => {
  try {
    if (!GENAI_API_KEY) {
      throw new Error("Gemini API key not configured");
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents:
        "Generate 5 different realistic short email bodies for transactions. Include Uber, a restaurant, a software subscription, an amazon purchase, and a utility bill. Vary the dates slightly within the current month. Just return the email bodies separated by '---SPLIT---'.",
    });

    if (response.text) {
      return response.text
        .split("---SPLIT---")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }
    return [];
  } catch (e) {
    console.error(e);
    return [];
  }
};
