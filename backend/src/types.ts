export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category:
    | "Food"
    | "Transport"
    | "Shopping"
    | "Utilities"
    | "Subscription"
    | "Other";
  summary: string;
  isPending?: boolean;
  type?: "expense" | "income"; // Transaction type: expense or income
  userId?: string; // User ID to relate transaction to user
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface EmailFilterSettings {
  id?: string;
  fromEmail?: string;
  subjectKeywords?: string;
  hasAttachment?: boolean;
  label?: string;
  customQuery?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GmailMessagePart {
  mimeType: string;
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessagePayload {
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail {
  id: string;
  threadId: string;
  payload: GmailMessagePayload;
}
