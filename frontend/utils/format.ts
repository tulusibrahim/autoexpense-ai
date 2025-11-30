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

