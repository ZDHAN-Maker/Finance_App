import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";

const ALLOWED_TYPES = ["income", "expense"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  const id = req.query.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "BadRequest", message: "id transaksi tidak valid." });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("transactions")
      .select("id, type, amount, description, category_id, transaction_date, source, created_at, categories(name)")
      .eq("user_id", appUser.id)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "NotFound", message: "Transaksi tidak ditemukan." });
      return;
    }
    res.status(200).json({ data });
    return;
  }

  if (req.method === "PUT") {
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};

    if (body.type !== undefined) {
      if (!ALLOWED_TYPES.includes(body.type)) {
        res.status(400).json({ error: "BadRequest", message: "type harus 'income' atau 'expense'." });
        return;
      }
      update.type = body.type;
    }
    if (body.amount !== undefined) {
      const numericAmount = Number(body.amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        res.status(400).json({ error: "BadRequest", message: "amount harus angka positif." });
        return;
      }
      update.amount = numericAmount;
    }
    if (body.description !== undefined) {
      if (String(body.description).length > 200) {
        res.status(400).json({ error: "BadRequest", message: "description maksimal 200 karakter." });
        return;
      }
      update.description = String(body.description).slice(0, 200);
    }
    if (body.category_id !== undefined) update.category_id = body.category_id || null;
    if (body.transaction_date !== undefined) update.transaction_date = body.transaction_date;

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "BadRequest", message: "Tidak ada field yang diubah." });
      return;
    }

    const { data, error } = await supabase
      .from("transactions")
      .update(update)
      .eq("user_id", appUser.id)
      .eq("id", id)
      .select("id, type, amount, description, category_id, transaction_date, source, created_at")
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "NotFound", message: "Transaksi tidak ditemukan." });
      return;
    }
    res.status(200).json({ data });
    return;
  }

  if (req.method === "DELETE") {
    const { error, count } = await supabase
      .from("transactions")
      .delete({ count: "exact" })
      .eq("user_id", appUser.id)
      .eq("id", id);

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "NotFound", message: "Transaksi tidak ditemukan." });
      return;
    }
    res.status(204).end();
    return;
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  res.status(405).json({ error: "MethodNotAllowed" });
}
