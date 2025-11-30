import http from "./http";
import { Transaction, UserProfile } from "../types";

// API Response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/**
 * API Service - All backend API calls
 */
export const api = {
  /**
   * Get user profile from Google OAuth token
   */
  getUserProfile: async (accessToken: string): Promise<UserProfile> => {
    const response = await http.post<ApiResponse<UserProfile>>(
      "/user/profile",
      {
        accessToken,
      }
    );
    return response.data.data;
  },

  /**
   * Get all expenses
   */
  getExpenses: async (): Promise<Transaction[]> => {
    const response = await http.get<ApiResponse<Transaction[]>>("/expenses");
    return response.data.data;
  },

  /**
   * Get single expense by ID
   */
  getExpense: async (id: string): Promise<Transaction> => {
    const response = await http.get<ApiResponse<Transaction>>(
      `/expenses/${id}`
    );
    return response.data.data;
  },

  /**
   * Create or update expense
   */
  updateExpense: async (transaction: Transaction): Promise<Transaction> => {
    const response = await http.put<ApiResponse<Transaction>>(
      `/expenses/${transaction.id}`,
      transaction
    );
    return response.data.data;
  },

  /**
   * Delete expense
   */
  deleteExpense: async (id: string): Promise<void> => {
    await http.delete(`/expenses/${id}`);
  },

  /**
   * Scan inbox for expenses
   */
  scanInbox: async (
    accessToken: string | null,
    isDemoMode: boolean,
    dateFilter?: "today" | "7days" | "14days" | "30days" | "lastweek"
  ): Promise<Transaction[]> => {
    const response = await http.post<ApiResponse<Transaction[]>>(
      "/expenses/scan",
      {
        accessToken,
        isDemoMode,
        dateFilter: dateFilter || "30days",
      }
    );
    return response.data.data;
  },

  /**
   * Generate demo emails (for testing)
   */
  generateDemoEmails: async (): Promise<string[]> => {
    const response = await http.post<ApiResponse<string[]>>("/emails/demo");
    return response.data.data;
  },

  /**
   * Get email filter settings
   */
  getEmailFilterSettings: async (): Promise<{
    id?: string;
    fromEmail: string;
    subjectKeywords: string;
    hasAttachment: boolean;
    label: string;
    customQuery: string;
    createdAt?: string;
    updatedAt?: string;
  }> => {
    const response = await http.get<
      ApiResponse<{
        id?: string;
        fromEmail: string;
        subjectKeywords: string;
        hasAttachment: boolean;
        label: string;
        customQuery: string;
        createdAt?: string;
        updatedAt?: string;
      }>
    >("/settings/email-filters");
    return response.data.data;
  },

  /**
   * Save email filter settings
   */
  saveEmailFilterSettings: async (settings: {
    fromEmail?: string;
    subjectKeywords?: string;
    hasAttachment?: boolean;
    label?: string;
    customQuery?: string;
  }): Promise<void> => {
    await http.put("/settings/email-filters", settings);
  },
};
