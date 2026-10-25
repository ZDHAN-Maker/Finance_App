import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";
import { currentMonthKey, monthKeyToRange } from "../_lib/format.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "MethodNotAllowed" });
    return;
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  const rawView = Array.isArray(req.query.view) ? req.query.view[0] : req.query.view;
  const view = String(rawView ?? "").toLowerCase();

  const monthKey =
    typeof req.query.month === "string" && req.query.month
      ? req.query.month
      : currentMonthKey();

  let range: { start: string; end: string };
  try {
    range = monthKeyToRange(monthKey);
  } catch (e) {
    res.status(400).json({ error: "BadRequest", message: (e as Error).message });
    return;
  }

  // View: Monthly Overview (/api/summary/monthly)
  if (view === "monthly") {
    const { data, error } = await supabase
      .from("transactions")
      .select("type, amount")
      .eq("user_id", appUser.id)
      .gte("transaction_date", range.start)
      .lte("transaction_date", range.end);

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    let totalIncome = 0;
    let totalExpense = 0;
    for (const row of data ?? []) {
      if (row.type === "income") totalIncome += Number(row.amount);
      else totalExpense += Number(row.amount);
    }

    res.status(200).json({
      data: {
        month: monthKey,
        total_income: totalIncome,
        total_expense: totalExpense,
        difference: totalIncome - totalExpense,
        transaction_count: data?.length ?? 0,
      },
    });
    return;
  }

  // View: Category Breakdown (/api/summary/categories)
  if (view === "categories") {
    const type = req.query.type === "income" ? "income" : "expense";

    const { data, error } = await supabase
      .from("transactions")
      .select("amount, category_id, categories(name)")
      .eq("user_id", appUser.id)
      .eq("type", type)
      .gte("transaction_date", range.start)
      .lte("transaction_date", range.end);

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    const totals = new Map<string, { category_id: string | null; name: string; amount: number }>();
    let grandTotal = 0;

    for (const row of data ?? []) {
      const categoryRow = row.categories as unknown as { name: string } | { name: string }[] | null;
      const name = Array.isArray(categoryRow) ? categoryRow[0]?.name : categoryRow?.name;
      const key = row.category_id ?? "uncategorized";
      const label = name ?? "Tanpa kategori";
      const existing = totals.get(key);
      const amount = Number(row.amount);
      grandTotal += amount;
      if (existing) {
        existing.amount += amount;
      } else {
        totals.set(key, { category_id: row.category_id, name: label, amount });
      }
    }

    const breakdown = Array.from(totals.values())
      .sort((a, b) => b.amount - a.amount)
      .map((item) => ({
        ...item,
        percentage: grandTotal > 0 ? Math.round((item.amount / grandTotal) * 1000) / 10 : 0,
      }));

    res.status(200).json({ data: { month: monthKey, type, total: grandTotal, breakdown } });
    return;
  }

  res.status(404).json({
    error: "NotFound",
    message: `Summary view '${view}' tidak ditemukan. Gunakan 'monthly' atau 'categories'.`,
  });
}
