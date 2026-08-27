import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Transaction, TransactionType } from "../types";

export interface TransactionFilters {
  month?: string;
  categoryId?: string;
  search?: string;
}

export interface TransactionInput {
  type: TransactionType;
  amount: number;
  description: string;
  category_id: string | null;
  transaction_date: string;
}

export function useTransactions(filters: TransactionFilters) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.month) params.set("month", filters.month);
      if (filters.categoryId) params.set("category_id", filters.categoryId);
      if (filters.search) params.set("search", filters.search);

      const res = await api.get<{ data: Transaction[] }>(`/transactions?${params.toString()}`);
      setTransactions(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.month, filters.categoryId, filters.search]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function createTransaction(input: TransactionInput) {
    const res = await api.post<{ data: Transaction }>("/transactions", input);
    await refetch();
    return res.data;
  }

  async function updateTransaction(id: string, input: Partial<TransactionInput>) {
    const res = await api.put<{ data: Transaction }>(`/transactions/${id}`, input);
    await refetch();
    return res.data;
  }

  async function deleteTransaction(id: string) {
    await api.delete(`/transactions/${id}`);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  }

  return { transactions, loading, error, refetch, createTransaction, updateTransaction, deleteTransaction };
}
