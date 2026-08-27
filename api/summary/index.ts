import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "MethodNotAllowed" });
    return;
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  const { data, error } = await supabase
    .from("transactions")
    .select("type, amount")
    .eq("user_id", appUser.id);

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

  // Catatan: MVP belum punya konsep "saldo awal" per user, jadi saldo
  // dihitung murni dari total pemasukan - total pengeluaran yang tercatat
  // (baseline 0). Field "starting_balance" disiapkan untuk pengembangan
  // lanjutan (lihat README bagian "Yang belum diimplementasikan").
  const startingBalance = 0;
  const balance = startingBalance + totalIncome - totalExpense;

  res.status(200).json({
    data: {
      starting_balance: startingBalance,
      total_income: totalIncome,
      total_expense: totalExpense,
      balance,
      transaction_count: data?.length ?? 0,
    },
  });
}
