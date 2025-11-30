import dayjs from "dayjs";
import { Transaction } from "../types";

export type TransactionDateFilter =
  | "all"
  | "today"
  | "thisweek"
  | "thismonth"
  | "last7days"
  | "last30days"
  | "last90days";

/**
 * Get the start date for a given filter
 */
export const getFilterStartDate = (filter: TransactionDateFilter): Date => {
  const today = dayjs().startOf("day");

  switch (filter) {
    case "today":
      return today.toDate();
    case "thisweek":
      return today.startOf("week").toDate();
    case "thismonth":
      return today.startOf("month").toDate();
    case "last7days":
      return today.subtract(7, "days").toDate();
    case "last30days":
      return today.subtract(30, "days").toDate();
    case "last90days":
      return today.subtract(90, "days").toDate();
    default:
      return new Date(0); // Beginning of time
  }
};

/**
 * Filter transactions by date range
 */
export const filterTransactionsByDate = (
  transactions: Transaction[],
  filter: TransactionDateFilter
): Transaction[] => {
  if (filter === "all") {
    return transactions;
  }

  const startDate = getFilterStartDate(filter);
  const endDate = dayjs().endOf("day").toDate();

  return transactions.filter((transaction) => {
    const transactionDate = dayjs(transaction.date).toDate();
    return transactionDate >= startDate && transactionDate <= endDate;
  });
};

/**
 * Get filter label for display
 */
export const getFilterLabel = (filter: TransactionDateFilter): string => {
  switch (filter) {
    case "all":
      return "All Time";
    case "today":
      return "Today";
    case "thisweek":
      return "This Week";
    case "thismonth":
      return "This Month";
    case "last7days":
      return "Last 7 Days";
    case "last30days":
      return "Last 30 Days";
    case "last90days":
      return "Last 90 Days";
    default:
      return "All Time";
  }
};
