import http from "./http";
import { Transaction, UserProfile } from "../types";

// API Response wrapper type
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

// Helper to get userId from localStorage
const getUserId = (): string | null => {
  const userProfile = localStorage.getItem("user_profile");
  if (userProfile) {
    try {
      const profile = JSON.parse(userProfile) as UserProfile;
      return profile.userId || profile.id || null;
    } catch (e) {
      return null;
    }
  }
  return null;
};

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
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
    const response = await http.get<ApiResponse<Transaction[]>>("/expenses", {
      params: { userId },
    });
    return response.data.data;
  },

  /**
   * Get single expense by ID
   */
  getExpense: async (id: string): Promise<Transaction> => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
    const response = await http.get<ApiResponse<Transaction>>(
      `/expenses/${id}`,
      { params: { userId } }
    );
    return response.data.data;
  },

  /**
   * Create or update expense
   */
  updateExpense: async (transaction: Transaction): Promise<Transaction> => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
    const response = await http.put<ApiResponse<Transaction>>(
      `/expenses/${transaction.id}?userId=${userId}`,
      transaction
    );
    return response.data.data;
  },

  /**
   * Delete expense
   */
  deleteExpense: async (id: string): Promise<void> => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
    await http.delete(`/expenses/${id}`, { params: { userId } });
  },

  /**
   * Scan inbox for expenses
   */
  scanInbox: async (
    accessToken: string | null,
    isDemoMode: boolean,
    startDate: string,
    endDate: string
  ): Promise<Transaction[]> => {
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
    const response = await http.post<ApiResponse<Transaction[]>>(
      "/expenses/scan",
      {
        accessToken,
        isDemoMode,
        startDate,
        endDate,
        userId,
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
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
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
    >("/settings/email-filters", { params: { userId } });
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
    const userId = getUserId();
    if (!userId) {
      throw new Error("User not logged in");
    }
    await http.put("/settings/email-filters", { ...settings, userId });
  },
};
