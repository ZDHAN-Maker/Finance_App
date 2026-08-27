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

  const monthKey = typeof req.query.month === "string" && req.query.month ? req.query.month : currentMonthKey();

  let range: { start: string; end: string };
  try {
    range = monthKeyToRange(monthKey);
  } catch (e) {
    res.status(400).json({ error: "BadRequest", message: (e as Error).message });
    return;
  }

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
}
