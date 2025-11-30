/**
 * Format number with Indonesian number format (dot as thousand separator)
 * Examples: 1000 -> "1.000", 10000 -> "10.000", 1000000 -> "1.000.000"
 */
export const formatNumber = (value: number | string): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) return "0";

  // Convert to string and split by decimal point
  const parts = numValue.toString().split(".");
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Add thousand separators (dots) to integer part
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  // Combine with decimal part if exists
  if (decimalPart) {
    return `${formattedInteger},${decimalPart}`;
  }

  return formattedInteger;
};

/**
 * Format currency in Indonesian Rupiah (IDR) format
 * Examples: 1000 -> "Rp 1.000", 10000 -> "Rp 10.000", 1000000 -> "Rp 1.000.000"
 */
export const formatCurrency = (
  amount: number | string,
  showDecimals: boolean = false
): string => {
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) return "Rp 0";

  if (showDecimals) {
    // Format with 2 decimal places
    const formatted = numAmount.toFixed(2);
    const parts = formatted.split(".");
    const integerPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `Rp ${integerPart},${parts[1]}`;
  } else {
    // Format as whole number
    const rounded = Math.round(numAmount);
    const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `Rp ${formatted}`;
  }
};

/**
 * Parse formatted number string back to number
 * Handles both "1.000" and "1,000" formats
 */
export const parseFormattedNumber = (value: string): number => {
  // Remove all dots (thousand separators) and replace comma with dot for decimal
  const cleaned = value.replace(/\./g, "").replace(",", ".");
  return parseFloat(cleaned) || 0;
};

/**
 * Format date/datetime string for display
 * Handles both date-only (YYYY-MM-DD) and datetime (YYYY-MM-DDTHH:mm:ss or YYYY-MM-DD HH:mm:ss) formats
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return "";

  // Try to parse as ISO datetime (YYYY-MM-DDTHH:mm:ss)
  const isoMatch = dateString.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2}:\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]} ${isoMatch[2]}`;
  }

  // Try to parse as space-separated datetime (YYYY-MM-DD HH:mm:ss)
  const spaceMatch = dateString.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})/
  );
  if (spaceMatch) {
    return dateString; // Already formatted
  }

  // If it's just a date (YYYY-MM-DD), return as is
  const dateMatch = dateString.match(/^\d{4}-\d{2}-\d{2}$/);
  if (dateMatch) {
    return dateString;
  }

  // Fallback: try to parse and format
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");

      // Check if time is 00:00:00 (date-only)
      if (hours === "00" && minutes === "00" && seconds === "00") {
        return `${year}-${month}-${day}`;
      }
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  } catch (e) {
    // If parsing fails, return original string
  }

  return dateString;
};
