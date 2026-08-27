import { useCallback, useEffect, useState } from "react";
import { api } from "../services/api";
import type { SummaryTotal, SummaryMonthly, SummaryCategories } from "../types";

export function useSummary(monthKey: string) {
  const [total, setTotal] = useState<SummaryTotal | null>(null);
  const [monthly, setMonthly] = useState<SummaryMonthly | null>(null);
  const [categoryBreakdown, setCategoryBreakdown] = useState<SummaryCategories | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [totalRes, monthlyRes, categoriesRes] = await Promise.all([
        api.get<{ data: SummaryTotal }>("/summary"),
        api.get<{ data: SummaryMonthly }>(`/summary/monthly?month=${monthKey}`),
        api.get<{ data: SummaryCategories }>(`/summary/categories?month=${monthKey}&type=expense`),
      ]);
      setTotal(totalRes.data);
      setMonthly(monthlyRes.data);
      setCategoryBreakdown(categoriesRes.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [monthKey]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { total, monthly, categoryBreakdown, loading, error, refetch };
}
