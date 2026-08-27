import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { Category, TransactionType } from "../types";

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ data: Category[] }>("/categories");
      setCategories(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function createCategory(name: string, type: TransactionType) {
    const res = await api.post<{ data: Category }>("/categories", { name, type });
    setCategories((prev) => [...prev, res.data]);
    return res.data;
  }

  async function deleteCategory(id: string) {
    await api.delete(`/categories/${id}`);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  }

  return { categories, loading, error, refetch, createCategory, deleteCategory };
}
