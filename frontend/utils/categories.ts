/**
 * Category management utilities
 */

const CATEGORIES_STORAGE_KEY = "ae_categories";
const DEFAULT_CATEGORIES = [
  "Food",
  "Transport",
  "Shopping",
  "Utilities",
  "Subscription",
  "Other",
];

export const getCategories = (): string[] => {
  if (typeof window === "undefined") return DEFAULT_CATEGORIES;
  
  const stored = localStorage.getItem(CATEGORIES_STORAGE_KEY);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      // Ensure "Other" always exists
      if (!parsed.includes("Other")) {
        parsed.push("Other");
      }
      return parsed;
    } catch {
      return DEFAULT_CATEGORIES;
    }
  }
  return DEFAULT_CATEGORIES;
};

export const saveCategories = (categories: string[]): void => {
  if (typeof window === "undefined") return;
  
  // Ensure "Other" always exists
  const categoriesToSave = categories.includes("Other")
    ? categories
    : [...categories, "Other"];
  
  localStorage.setItem(CATEGORIES_STORAGE_KEY, JSON.stringify(categoriesToSave));
};

export const addCategory = (category: string): string[] => {
  const categories = getCategories();
  if (categories.includes(category)) {
    return categories; // Already exists
  }
  const updated = [...categories.filter((c) => c !== "Other"), category, "Other"];
  saveCategories(updated);
  return updated;
};

export const deleteCategory = (category: string): string[] => {
  if (category === "Other") {
    // Cannot delete "Other" category
    return getCategories();
  }
  const categories = getCategories();
  const updated = categories.filter((c) => c !== category);
  saveCategories(updated);
  return updated;
};

