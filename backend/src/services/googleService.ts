import {
  GmailMessageDetail,
  GmailMessagePayload,
  GmailMessagePart,
} from "../types";

// Helper to decode Base64URL (Node.js version)
const decodeBase64 = (data: string): string => {
  try {
    return Buffer.from(
      data.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf-8");
  } catch (e) {
    console.error("Error decoding base64", e);
    return "";
  }
};

const getBodyFromPayload = (
  payload: GmailMessagePayload | GmailMessagePart
): string => {
  let body = "";
  if (payload.body && payload.body.data) {
    body = decodeBase64(payload.body.data);
  } else if (payload.parts) {
    // Prefer text/plain, fallback to text/html
    const textPart = payload.parts.find((p) => p.mimeType === "text/plain");
    const htmlPart = payload.parts.find((p) => p.mimeType === "text/html");

    if (textPart && textPart.body && textPart.body.data) {
      body = decodeBase64(textPart.body.data);
    } else if (htmlPart && htmlPart.body && htmlPart.body.data) {
      // Very basic strip tags for HTML only parts
      const html = decodeBase64(htmlPart.body.data);
      body = html.replace(/<[^>]*>?/gm, "");
    } else if (payload.parts[0]) {
      // Recursive check for nested parts (multipart/alternative)
      return getBodyFromPayload(payload.parts[0]);
    }
  }
  return body;
};

export interface EmailFilterOptions {
  fromEmail?: string;
  subjectKeywords?: string;
  hasAttachment?: boolean;
  label?: string;
  customQuery?: string;
}

export const fetchRecentEmails = async (
  accessToken: string,
  maxResults: number = 10,
  dateFilter:
    | "today"
    | "7days"
    | "14days"
    | "30days"
    | "lastweek"
    | "all" = "today",
  filterOptions?: EmailFilterOptions
): Promise<string[]> => {
  try {
    // Build Gmail query with date filter
    // Gmail API uses YYYY/MM/DD format for dates
    let dateQuery = "";
    const today = new Date();

    const formatDate = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}/${month}/${day}`;
    };

    switch (dateFilter) {
      case "today":
        const todayStart = new Date(today);
        todayStart.setHours(0, 0, 0, 0);
        dateQuery = `after:${formatDate(todayStart)}`;
        break;
      case "7days":
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        dateQuery = `after:${formatDate(sevenDaysAgo)}`;
        break;
      case "14days":
        const fourteenDaysAgo = new Date(today);
        fourteenDaysAgo.setDate(today.getDate() - 14);
        dateQuery = `after:${formatDate(fourteenDaysAgo)}`;
        break;
      case "30days":
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        dateQuery = `after:${formatDate(thirtyDaysAgo)}`;
        break;
      case "lastweek":
        // Last week = 7-14 days ago
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - 7);
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(today.getDate() - 14);
        dateQuery = `after:${formatDate(lastWeekStart)} before:${formatDate(
          lastWeekEnd
        )}`;
        break;
    }

    // Build the query string from filter options
    const queryParts: string[] = [];

    if (filterOptions?.customQuery) {
      // If custom query is provided, use it (but still add date filter if needed)
      queryParts.push(filterOptions.customQuery);
    } else {
      // Build query from individual filter options
      if (filterOptions?.fromEmail) {
        queryParts.push(`from:${filterOptions.fromEmail}`);
      }

      if (filterOptions?.subjectKeywords) {
        const keywords = filterOptions.subjectKeywords
          .split(",")
          .map((k) => k.trim())
          .filter((k) => k.length > 0);
        if (keywords.length > 0) {
          queryParts.push(`subject:(${keywords.join(" OR ")})`);
        }
      }

      if (filterOptions?.hasAttachment) {
        queryParts.push("has:attachment");
      }

      if (filterOptions?.label) {
        queryParts.push(`label:${filterOptions.label}`);
      }

      // Default: search for common receipt/transaction keywords if no filters specified
      if (queryParts.length === 0) {
        queryParts.push("subject:(receipt OR order OR invoice OR payment)");
      }
    }

    // Add date filter if specified
    if (dateQuery) {
      queryParts.push(dateQuery);
    }

    const fullQuery = queryParts.join(" ");

    // 1. List Messages
    const listResponse = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(
        fullQuery
      )}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );

    if (!listResponse.ok)
      throw new Error(`Failed to list messages: ${listResponse.status}`);

    const listData = (await listResponse.json()) as {
      messages: { id: string; threadId: string }[];
    };
    const messages = listData.messages as { id: string; threadId: string }[];

    if (!messages || messages.length === 0) return [];

    // 2. Fetch details for each message (Batching is better in prod, serial for simplicity here)
    const emailBodies: string[] = [];

    for (const msg of messages) {
      const detailResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      if (detailResponse.ok) {
        const detail = (await detailResponse.json()) as GmailMessageDetail;
        const body = getBodyFromPayload(detail.payload);
        if (body) emailBodies.push(body);
      }
    }

    return emailBodies;
  } catch (error) {
    console.error("Gmail API Error:", error);
    throw error;
  }
};

export const fetchUserProfile = async (accessToken: string) => {
  const res = await fetch(
    "https://www.googleapis.com/oauth2/v1/userinfo?alt=json",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (res.ok) return res.json();
  throw new Error("Failed to fetch user profile");
};
