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
// Railway provides PORT automatically, use it if available
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

// Drop existing tables to recreate with new schema
// db.exec(`DROP TABLE IF EXISTS transactions;`);
// db.exec(`DROP TABLE IF EXISTS email_filter_settings;`);
// db.exec(`DROP TABLE IF EXISTS users;`);

// // Create users table
// db.exec(`
//   CREATE TABLE users (
//     id TEXT PRIMARY KEY,
//     email TEXT NOT NULL UNIQUE,
//     name TEXT NOT NULL,
//     picture TEXT,
//     createdAt TEXT DEFAULT (datetime('now')),
//     updatedAt TEXT DEFAULT (datetime('now'))
//   )
// `);

// // Create transactions table
// db.exec(`
//   CREATE TABLE transactions (
//     id TEXT PRIMARY KEY,
//     merchant TEXT NOT NULL,
//     amount REAL NOT NULL,
//     currency TEXT NOT NULL,
//     date TEXT NOT NULL,
//     category TEXT NOT NULL,
//     summary TEXT NOT NULL,
//     isPending INTEGER DEFAULT 0,
//     type TEXT DEFAULT 'expense',
//     userId TEXT,
//     createdAt TEXT DEFAULT (datetime('now')),
//     updatedAt TEXT DEFAULT (datetime('now')),
//     FOREIGN KEY (userId) REFERENCES users(id)
//   )
// `);

// // Create email_filter_settings table
// db.exec(`
//   CREATE TABLE email_filter_settings (
//     id TEXT PRIMARY KEY,
//     fromEmail TEXT,
//     subjectKeywords TEXT,
//     hasAttachment INTEGER DEFAULT 0,
//     label TEXT,
//     customQuery TEXT,
//     userId TEXT,
//     createdAt TEXT DEFAULT (datetime('now')),
//     updatedAt TEXT DEFAULT (datetime('now')),
//     FOREIGN KEY (userId) REFERENCES users(id)
//   )
// `);

// Create index for faster queries
// db.exec(`
//   CREATE INDEX idx_transactions_date ON transactions(date DESC);
//   CREATE INDEX idx_transactions_category ON transactions(category);
//   CREATE INDEX idx_transactions_userId ON transactions(userId);
//   CREATE INDEX idx_email_filter_settings_userId ON email_filter_settings(userId);
// `);

// db.exec(`
//   DROP TABLE IF EXISTS transactions;
// `);
// db.exec(`
//   DROP TABLE IF EXISTS email_filter_settings;
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
    type: row.type || "expense",
    userId: row.userId,
  };
};

// Helper to get or create user
const getOrCreateUser = (profile: any): string => {
  const checkStmt = db.prepare("SELECT id FROM users WHERE email = ?");
  const existing = checkStmt.get(profile.email) as any;

  if (existing) {
    // Update user info if needed
    const updateStmt = db.prepare(`
      UPDATE users 
      SET name = ?, picture = ?, updatedAt = datetime('now')
      WHERE id = ?
    `);
    updateStmt.run(profile.name, profile.picture || null, existing.id);
    return existing.id;
  }

  // Create new user
  const userId = profile.id || generateId();
  const insertStmt = db.prepare(`
    INSERT INTO users (id, email, name, picture, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
  `);
  insertStmt.run(userId, profile.email, profile.name, profile.picture || null);
  return userId;
};

// Create Elysia app
const app = new Elysia({ adapter: node() })
  .use(cors())

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
        // Get or create user in database
        const userId = getOrCreateUser(profile);
        return { success: true, data: { ...(profile as any), userId } };
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
  .get("/expenses", ({ query, set }) => {
    const { userId } = query as { userId?: string };

    if (!userId) {
      set.status = 400;
      return {
        success: false,
        error: "userId is required",
      };
    }

    const stmt = db.prepare(
      "SELECT * FROM transactions WHERE userId = ? ORDER BY date DESC"
    );
    const rows = stmt.all(userId);
    const transactions = rows.map(rowToTransaction);

    return {
      success: true,
      data: transactions,
    };
  })

  // Get single expense by ID
  .get("/expenses/:id", ({ params, query, set }) => {
    const { userId } = query as { userId?: string };

    if (!userId) {
      set.status = 400;
      return { success: false, error: "userId is required" };
    }

    const stmt = db.prepare(
      "SELECT * FROM transactions WHERE id = ? AND userId = ?"
    );
    const row = stmt.get(params.id, userId) as any;

    if (!row) {
      set.status = 404;
      return { success: false, error: "Transaction not found" };
    }

    return { success: true, data: rowToTransaction(row) };
  })

  // Create/Update expense
  .put(
    "/expenses/:id",
    ({ params, body, query, set }) => {
      const transactionData = body as Partial<Transaction>;
      const { userId } = query as { userId?: string };

      if (!userId) {
        set.status = 400;
        return { success: false, error: "userId is required" };
      }

      // Check if transaction exists
      const checkStmt = db.prepare(
        "SELECT id FROM transactions WHERE id = ? AND userId = ?"
      );
      const existing = checkStmt.get(params.id, userId) as any;

      if (!existing) {
        // Create new transaction
        const insertStmt = db.prepare(`
          INSERT INTO transactions (id, merchant, amount, currency, date, category, summary, isPending, type, userId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);

        insertStmt.run(
          params.id,
          transactionData.merchant!,
          transactionData.amount!,
          transactionData.currency!,
          transactionData.date!,
          transactionData.category!,
          transactionData.summary!,
          transactionData.isPending ? 1 : 0,
          transactionData.type || "expense",
          userId
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
          type: transactionData.type || "expense",
          userId: userId,
        };

        return { success: true, data: newTransaction };
      }

      // Update existing transaction
      const updateStmt = db.prepare(`
        UPDATE transactions 
        SET merchant = ?, amount = ?, currency = ?, date = ?, category = ?, summary = ?, isPending = ?, type = ?, updatedAt = datetime('now')
        WHERE id = ? AND userId = ?
      `);

      updateStmt.run(
        transactionData.merchant!,
        transactionData.amount!,
        transactionData.currency!,
        transactionData.date!,
        transactionData.category!,
        transactionData.summary!,
        transactionData.isPending ? 1 : 0,
        transactionData.type || "expense",
        params.id,
        userId
      );

      // Fetch updated transaction
      const getStmt = db.prepare(
        "SELECT * FROM transactions WHERE id = ? AND userId = ?"
      );
      const updatedRow = getStmt.get(params.id, userId) as any;

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
        type: t.Optional(t.Union([t.Literal("expense"), t.Literal("income")])),
      }),
    }
  )

  // Delete expense
  .delete("/expenses/:id", ({ params, query, set }) => {
    const { userId } = query as { userId?: string };

    if (!userId) {
      set.status = 400;
      return { success: false, error: "userId is required" };
    }

    const checkStmt = db.prepare(
      "SELECT id FROM transactions WHERE id = ? AND userId = ?"
    );
    const existing = checkStmt.get(params.id, userId) as any;

    if (!existing) {
      set.status = 404;
      return { success: false, error: "Transaction not found" };
    }

    const deleteStmt = db.prepare(
      "DELETE FROM transactions WHERE id = ? AND userId = ?"
    );
    deleteStmt.run(params.id, userId);

    return { success: true, message: "Transaction deleted" };
  })

  // Scan inbox for expenses
  .post(
    "/expenses/scan",
    async ({ body, set }) => {
      const { accessToken, isDemoMode, startDate, endDate, userId } = body as {
        accessToken: string | null;
        isDemoMode?: boolean;
        startDate?: string;
        endDate?: string;
        userId?: string;
      };

      if (!userId) {
        set.status = 400;
        return {
          success: false,
          error: "userId is required",
        };
      }

      if (!isDemoMode && accessToken && (!startDate || !endDate)) {
        set.status = 400;
        return {
          success: false,
          error: "startDate and endDate are required for real mode",
        };
      }

      try {
        let emails: string[] = [];

        if (isDemoMode) {
          // Generate demo emails using Gemini
          emails = await generateDemoEmails();
        } else if (accessToken && startDate && endDate) {
          // Load email filter settings from database for this user
          const settingsStmt = db.prepare(
            "SELECT * FROM email_filter_settings WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1"
          );
          const settingsRow = settingsStmt.get(userId) as any;

          const filterOptions = settingsRow
            ? {
                fromEmail: settingsRow.fromEmail || undefined,
                subjectKeywords: settingsRow.subjectKeywords || undefined,
                hasAttachment: settingsRow.hasAttachment === 1,
                label: settingsRow.label || undefined,
                customQuery: settingsRow.customQuery || undefined,
              }
            : undefined;

          // Fetch real emails from Gmail with date range
          emails = await fetchRecentEmails(
            accessToken,
            10,
            startDate,
            endDate,
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
          INSERT INTO transactions (id, merchant, amount, currency, date, category, summary, isPending, type, userId, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        const checkStmt = db.prepare(`
          SELECT id FROM transactions 
          WHERE amount = ? AND date = ? AND userId = ?
        `);

        for (const emailBody of emails) {
          const transaction = await extractTransactionFromEmail(emailBody);

          if (transaction) {
            // Check if we already have this transaction (basic deduplication)
            const existing = checkStmt.get(
              transaction.amount,
              transaction.date,
              userId
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
                transaction.isPending ? 1 : 0,
                transaction.type || "expense",
                userId
              );
              newTransactions.push({ ...transaction, userId });
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
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
        userId: t.String(),
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
  .get("/settings/email-filters", ({ query, set }) => {
    const { userId } = query as { userId?: string };

    if (!userId) {
      set.status = 400;
      return {
        success: false,
        error: "userId is required",
      };
    }

    const stmt = db.prepare(
      "SELECT * FROM email_filter_settings WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1"
    );
    const row = stmt.get(userId) as any;

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
        userId?: string;
      };

      if (!settings.userId) {
        set.status = 400;
        return {
          success: false,
          error: "userId is required",
        };
      }

      try {
        // Check if settings exist for this user
        const checkStmt = db.prepare(
          "SELECT id FROM email_filter_settings WHERE userId = ? ORDER BY updatedAt DESC LIMIT 1"
        );
        const existing = checkStmt.get(settings.userId) as any;

        if (existing) {
          // Update existing settings
          const updateStmt = db.prepare(`
            UPDATE email_filter_settings
            SET fromEmail = ?, subjectKeywords = ?, hasAttachment = ?, label = ?, customQuery = ?, updatedAt = datetime('now')
            WHERE id = ? AND userId = ?
          `);
          updateStmt.run(
            settings.fromEmail || null,
            settings.subjectKeywords || null,
            settings.hasAttachment ? 1 : 0,
            settings.label || null,
            settings.customQuery || null,
            existing.id,
            settings.userId
          );
        } else {
          // Create new settings
          const insertStmt = db.prepare(`
            INSERT INTO email_filter_settings (id, fromEmail, subjectKeywords, hasAttachment, label, customQuery, userId, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
          `);
          insertStmt.run(
            generateId(),
            settings.fromEmail || null,
            settings.subjectKeywords || null,
            settings.hasAttachment ? 1 : 0,
            settings.label || null,
            settings.customQuery || null,
            settings.userId
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
        userId: t.String(),
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
