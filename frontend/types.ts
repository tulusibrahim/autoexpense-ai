export interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  date: string;
  category: string; // Dynamic category - can be any string
  summary: string;
  isPending?: boolean;
}

export interface EmailMessage {
  id: string;
  snippet: string;
  body: string;
  date: string;
}

export interface UserProfile {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
}

export enum AppView {
  LOGIN = "LOGIN",
  DASHBOARD = "DASHBOARD",
  SETTINGS = "SETTINGS",
}

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailMessagePart {
  mimeType: string;
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessagePayload {
  headers: GmailHeader[];
  body?: {
    data?: string;
  };
  parts?: GmailMessagePart[];
}

export interface GmailMessageDetail {
  id: string;
  snippet: string;
  payload: GmailMessagePayload;
  internalDate: string;
}
