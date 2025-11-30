import "dotenv/config";
import { Elysia, t } from "elysia";
import { node } from "@elysiajs/node";
import { cors } from "@elysiajs/cors";
import Database from "better-sqlite3";
import { Transaction, EmailFilterSettings } from "./types";
import { fetchRecentEmails, fetchUserProfile } from "./services/googleService";
import {
  extractTransactionFromEmail,
  generateDemoEmails,
} from "./services/geminiService";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

// Configuration
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const DB_PATH =
  process.env.DB_PATH || join(process.cwd(), "data", "expenses.db");

// Ensure data directory exists
const dataDir = join(process.cwd(), "data");
if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

// Initialize SQLite database
const db = new Database(DB_PATH);

// Enable foreign keys and WAL mode for better performance
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Create transactions table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY,
    merchant TEXT NOT NULL,
    amount REAL NOT NULL,
    currency TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    summary TEXT NOT NULL,
    isPending INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

// Remove CHECK constraint if it exists (for existing databases)
try {
  db.exec(
    `ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_category_check`
  );
} catch (e) {
  // Constraint might not exist, ignore error
}

// Create index for faster queries
db.exec(`
  CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
`);

// Create email_filter_settings table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS email_filter_settings (
    id TEXT PRIMARY KEY,
    fromEmail TEXT,
    subjectKeywords TEXT,
    hasAttachment INTEGER DEFAULT 0,
    label TEXT,
    customQuery TEXT,
    createdAt TEXT DEFAULT (datetime('now')),
    updatedAt TEXT DEFAULT (datetime('now'))
  )
`);

// db.exec(`
//   DROP TABLE IF EXISTS transactions;
// `);

// Helper to generate unique ID
const generateId = (): string => {
  return Math.random().toString(36).substring(7) + Date.now().toString(36);
};

// Helper to convert database row to Transaction
const rowToTransaction = (row: any): Transaction => {
  return {
    id: row.id,
    merchant: row.merchant,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    category: row.category as Transaction["category"],
    summary: row.summary,
    isPending: row.isPending === 1,
  };
};

// Create Elysia app
const app = new Elysia({ adapter: node() })
  .use(
    cors({
      origin: true, // Allow all origins in dev, restrict in production
      credentials: true,
    })
  )

  // Health check endpoint
  .get("/", () => {
    return {
      success: true,
      message: "AutoExpense AI Backend API",
      version: "1.0.0",
    };
  })

  // Get user profile
  .post(
    "/user/profile",
    async ({ body, set }) => {
      const { accessToken } = body as { accessToken: string };

      if (!accessToken) {
        set.status = 400;
        return {
          success: false,
          error: "Access token is required",
        };
      }

      try {
        const profile = await fetchUserProfile(accessToken);
        return { success: true, data: profile };
      } catch (e) {
        console.error("Failed to fetch user profile:", e);
        set.status = 500;
        return {
          success: false,
          error: "Failed to fetch user profile",
        };
      }
    },
    {
      body: t.Object({
        accessToken: t.String(),
      }),
    }
  )

  // Get all expenses
  .get("/expenses", () => {
    const stmt = db.prepare("SELECT * FROM transactions ORDER BY date DESC");
    const rows = stmt.all();
    const transactions = rows.map(rowToTransaction);

    return {
      success: true,
      data: transactions,
    };
  })

  // Get single expense by ID
  .get("/expenses/:id", ({ params, set }) => {
    const stmt = db.prepare("SELECT * FROM transactions WHERE id = ?");
    const row = stmt.get(params.id) as any;

    if (!row) {
      set.status = 404;
      return { success: false, error: "Transaction not found" };
    }

    return { success: true, data: rowToTransaction(row) };
  })

  // Create/Update expense
  .put(
    "/expenses/:id",
    ({ params, body }) => {
      const transactionData = body as Partial<Transaction>;

      // Check if transaction exists
      const checkStmt = db.prepare("SELECT id FROM transactions WHERE id = ?");
      const existing = checkStmt.get(params.id) as any;

      if (!existing) {
        // Create new transaction
        const insertStmt = db.prepare(`
          INSERT INTO transactions (id, merchant, amount, currency, date, category, summary, isPending, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        insertStmt.run(
          params.id,
          transactionData.merchant!,
          transactionData.amount!,
          transactionData.currency!,
          transactionData.date!,
          transactionData.category!,
          transactionData.summary!,
          transactionData.isPending ? 1 : 0
        );

        const newTransaction: Transaction = {
          id: params.id,
          merchant: transactionData.merchant!,
          amount: transactionData.amount!,
          currency: transactionData.currency!,
          date: transactionData.date!,
          category: transactionData.category!,
          summary: transactionData.summary!,
          isPending: transactionData.isPending || false,
        };

        return { success: true, data: newTransaction };
      }

      // Update existing transaction
      const updateStmt = db.prepare(`
        UPDATE transactions 
        SET merchant = ?, amount = ?, currency = ?, date = ?, category = ?, summary = ?, isPending = ?, updatedAt = datetime('now')
        WHERE id = ?
      `);

      updateStmt.run(
        transactionData.merchant!,
        transactionData.amount!,
        transactionData.currency!,
        transactionData.date!,
        transactionData.category!,
        transactionData.summary!,
        transactionData.isPending ? 1 : 0,
        params.id
      );

      // Fetch updated transaction
      const getStmt = db.prepare("SELECT * FROM transactions WHERE id = ?");
      const updatedRow = getStmt.get(params.id) as any;

      return { success: true, data: rowToTransaction(updatedRow) };
    },
    {
      body: t.Object({
        merchant: t.String(),
        amount: t.Number(),
        currency: t.String(),
        date: t.String(),
        category: t.String(), // Allow any category string
        summary: t.String(),
        isPending: t.Optional(t.Boolean()),
      }),
    }
  )

  // Delete expense
  .delete("/expenses/:id", ({ params, set }) => {
    const checkStmt = db.prepare("SELECT id FROM transactions WHERE id = ?");
    const existing = checkStmt.get(params.id) as any;

    if (!existing) {
      set.status = 404;
      return { success: false, error: "Transaction not found" };
    }

    const deleteStmt = db.prepare("DELETE FROM transactions WHERE id = ?");
    deleteStmt.run(params.id);

    return { success: true, message: "Transaction deleted" };
  })

  // Scan inbox for expenses
  .post(
    "/expenses/scan",
    async ({ body, set }) => {
      const { accessToken, isDemoMode, dateFilter } = body as {
        accessToken: string | null;
        isDemoMode?: boolean;
        dateFilter?: "today" | "7days" | "30days" | "lastweek" | "all";
      };

      try {
        let emails: string[] = [];

        if (isDemoMode) {
          // Generate demo emails using Gemini
          emails = await generateDemoEmails();
        } else if (accessToken) {
          // Load email filter settings from database
          const settingsStmt = db.prepare(
            "SELECT * FROM email_filter_settings ORDER BY updatedAt DESC LIMIT 1"
          );
          const settingsRow = settingsStmt.get() as any;

          const filterOptions = settingsRow
            ? {
                fromEmail: settingsRow.fromEmail || undefined,
                subjectKeywords: settingsRow.subjectKeywords || undefined,
                hasAttachment: settingsRow.hasAttachment === 1,
                label: settingsRow.label || undefined,
                customQuery: settingsRow.customQuery || undefined,
              }
            : undefined;

          // Fetch real emails from Gmail
          emails = await fetchRecentEmails(
            accessToken,
            10,
            dateFilter || "30days",
            filterOptions
          );
        } else {
          set.status = 400;
          return {
            success: false,
            error: "Access token is required for real mode",
          };
        }

        if (emails.length === 0) {
          return { success: true, data: [], message: "No emails found" };
        }

        // Process emails and extract transactions
        const newTransactions: Transaction[] = [];
        const insertStmt = db.prepare(`
          INSERT INTO transactions (id, merchant, amount, currency, date, category, summary, isPending, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        const checkStmt = db.prepare(`
          SELECT id FROM transactions 
          WHERE merchant = ? AND amount = ? AND date = ?
        `);

        for (const emailBody of emails) {
          const transaction = await extractTransactionFromEmail(emailBody);

          if (transaction) {
            // Check if we already have this transaction (basic deduplication)
            const existing = checkStmt.get(
              transaction.merchant,
              transaction.amount,
              transaction.date
            ) as any;

            if (!existing) {
              transaction.id = generateId();
              insertStmt.run(
                transaction.id,
                transaction.merchant,
                transaction.amount,
                transaction.currency,
                transaction.date,
                transaction.category,
                transaction.summary,
                transaction.isPending ? 1 : 0
              );
              newTransactions.push(transaction);
            }
          }
        }

        return {
          success: true,
          data: newTransactions,
          message: `Found ${newTransactions.length} new transaction(s)`,
        };
      } catch (e) {
        console.error("Scan inbox error:", e);
        set.status = 500;
        return {
          success: false,
          error: "Failed to scan inbox",
          details: e instanceof Error ? e.message : "Unknown error",
        };
      }
    },
    {
      body: t.Object({
        accessToken: t.Nullable(t.String()),
        isDemoMode: t.Optional(t.Boolean()),
        dateFilter: t.Optional(
          t.Union([
            t.Literal("today"),
            t.Literal("7days"),
            t.Literal("30days"),
            t.Literal("lastweek"),
            t.Literal("all"),
          ])
        ),
      }),
    }
  )

  // Generate demo emails endpoint (for testing)
  .post("/emails/demo", async () => {
    try {
      const emails = await generateDemoEmails();
      return { success: true, data: emails };
    } catch (e) {
      console.error("Failed to generate demo emails:", e);
      return { success: false, error: "Failed to generate demo emails" };
    }
  })

  // Get email filter settings
  .get("/settings/email-filters", () => {
    const stmt = db.prepare(
      "SELECT * FROM email_filter_settings ORDER BY updatedAt DESC LIMIT 1"
    );
    const row = stmt.get() as any;

    if (!row) {
      return {
        success: true,
        data: {
          fromEmail: "",
          subjectKeywords: "",
          hasAttachment: false,
          label: "",
          customQuery: "",
        },
      };
    }

    return {
      success: true,
      data: {
        id: row.id,
        fromEmail: row.fromEmail || "",
        subjectKeywords: row.subjectKeywords || "",
        hasAttachment: row.hasAttachment === 1,
        label: row.label || "",
        customQuery: row.customQuery || "",
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
    };
  })

  // Save email filter settings
  .put(
    "/settings/email-filters",
    ({ body, set }) => {
      const settings = body as {
        fromEmail?: string;
        subjectKeywords?: string;
        hasAttachment?: boolean;
        label?: string;
        customQuery?: string;
      };

      try {
        // Check if settings exist
        const checkStmt = db.prepare(
          "SELECT id FROM email_filter_settings ORDER BY updatedAt DESC LIMIT 1"
        );
        const existing = checkStmt.get() as any;

        if (existing) {
          // Update existing settings
          const updateStmt = db.prepare(`
            UPDATE email_filter_settings
            SET fromEmail = ?, subjectKeywords = ?, hasAttachment = ?, label = ?, customQuery = ?, updatedAt = datetime('now')
            WHERE id = ?
          `);
          updateStmt.run(
            settings.fromEmail || null,
            settings.subjectKeywords || null,
            settings.hasAttachment ? 1 : 0,
            settings.label || null,
            settings.customQuery || null,
            existing.id
          );
        } else {
          // Create new settings
          const insertStmt = db.prepare(`
            INSERT INTO email_filter_settings (id, fromEmail, subjectKeywords, hasAttachment, label, customQuery, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `);
          insertStmt.run(
            generateId(),
            settings.fromEmail || null,
            settings.subjectKeywords || null,
            settings.hasAttachment ? 1 : 0,
            settings.label || null,
            settings.customQuery || null
          );
        }

        return { success: true, message: "Email filter settings saved" };
      } catch (e) {
        console.error("Failed to save email filter settings:", e);
        set.status = 500;
        return {
          success: false,
          error: "Failed to save email filter settings",
        };
      }
    },
    {
      body: t.Object({
        fromEmail: t.Optional(t.String()),
        subjectKeywords: t.Optional(t.String()),
        hasAttachment: t.Optional(t.Boolean()),
        label: t.Optional(t.String()),
        customQuery: t.Optional(t.String()),
      }),
    }
  )
  .listen(PORT);

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down gracefully...");
  db.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n🛑 Shutting down gracefully...");
  db.close();
  process.exit(0);
});

console.log(`🚀 AutoExpense AI Backend running at http://localhost:${PORT}`);
console.log(`💾 Database: ${DB_PATH}`);
console.log(`📊 Endpoints available:`);
console.log(`   GET  / - Health check`);
console.log(`   POST /user/profile - Get user profile`);
console.log(`   GET  /expenses - Get all expenses`);
console.log(`   GET  /expenses/:id - Get expense by ID`);
console.log(`   PUT  /expenses/:id - Create/Update expense`);
console.log(`   DELETE /expenses/:id - Delete expense`);
console.log(`   POST /expenses/scan - Scan inbox for expenses`);
console.log(`   POST /emails/demo - Generate demo emails`);

export default app;
