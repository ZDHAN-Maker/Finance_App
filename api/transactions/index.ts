import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";
import { monthKeyToRange } from "../_lib/format.js";

const ALLOWED_TYPES = ["income", "expense"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  if (req.method === "GET") {
    const { month, category_id, search, limit, offset } = req.query;

    let query = supabase
      .from("transactions")
      .select("id, type, amount, description, category_id, transaction_date, source, created_at, categories(name)", {
        count: "exact",
      })
      .eq("user_id", appUser.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (typeof month === "string" && month) {
      try {
        const { start, end } = monthKeyToRange(month);
        query = query.gte("transaction_date", start).lte("transaction_date", end);
      } catch (e) {
        res.status(400).json({ error: "BadRequest", message: (e as Error).message });
        return;
      }
    }

    if (typeof category_id === "string" && category_id) {
      query = query.eq("category_id", category_id);
    }

    if (typeof search === "string" && search.trim()) {
      query = query.ilike("description", `%${search.trim()}%`);
    }

    const parsedLimit = Math.min(parseInt(String(limit ?? "50"), 10) || 50, 200);
    const parsedOffset = Math.max(parseInt(String(offset ?? "0"), 10) || 0, 0);
    query = query.range(parsedOffset, parsedOffset + parsedLimit - 1);

    const { data, error, count } = await query;

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    res.status(200).json({ data, count, limit: parsedLimit, offset: parsedOffset });
    return;
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const { type, amount, description, category_id, transaction_date } = body;

    if (!ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ error: "BadRequest", message: "type harus 'income' atau 'expense'." });
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: "BadRequest", message: "amount harus angka positif." });
      return;
    }
    if (description !== undefined && String(description).length > 200) {
      res.status(400).json({ error: "BadRequest", message: "description maksimal 200 karakter." });
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        user_id: appUser.id,
        type,
        amount: numericAmount,
        description: description ? String(description).slice(0, 200) : "",
        category_id: category_id || null,
        transaction_date: transaction_date || new Date().toISOString().slice(0, 10),
        source: "pwa",
      })
      .select("id, type, amount, description, category_id, transaction_date, source, created_at")
      .single();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    res.status(201).json({ data });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "MethodNotAllowed" });
}
