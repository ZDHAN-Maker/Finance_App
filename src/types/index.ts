export type TransactionType = "income" | "expense";
export type TransactionSource = "pwa" | "telegram";

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  user_id: string | null;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string | null;
  transaction_date: string; // YYYY-MM-DD
  source: TransactionSource;
  created_at: string;
  categories?: { name: string } | { name: string }[] | null;
}

export interface SummaryTotal {
  starting_balance: number;
  total_income: number;
  total_expense: number;
  balance: number;
  transaction_count: number;
}

export interface SummaryMonthly {
  month: string;
  total_income: number;
  total_expense: number;
  difference: number;
  transaction_count: number;
}

export interface CategoryBreakdownItem {
  category_id: string | null;
  name: string;
  amount: number;
  percentage: number;
}

export interface SummaryCategories {
  month: string;
  type: TransactionType;
  total: number;
  breakdown: CategoryBreakdownItem[];
}

export interface AppUserProfile {
  id: string;
  name: string | null;
  telegram_connected: boolean;
}

export function categoryNameOf(t: Pick<Transaction, "categories">): string | null {
  if (!t.categories) return null;
  return Array.isArray(t.categories) ? t.categories[0]?.name ?? null : t.categories.name;
}
