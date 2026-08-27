import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";

const ALLOWED_TYPES = ["income", "expense"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  if (req.method === "GET") {
    // RLS sudah membatasi: baris global (user_id null) + baris milik user ini.
    const { data, error } = await supabase
      .from("categories")
      .select("id, name, type, user_id")
      .order("type", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    res.status(200).json({ data });
    return;
  }

  if (req.method === "POST") {
    const { name, type } = req.body ?? {};

    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "BadRequest", message: "name wajib diisi." });
      return;
    }
    if (!ALLOWED_TYPES.includes(type)) {
      res.status(400).json({ error: "BadRequest", message: "type harus 'income' atau 'expense'." });
      return;
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({ user_id: appUser.id, name: name.trim().slice(0, 50), type })
      .select("id, name, type, user_id")
      .single();

    if (error) {
      if (error.code === "23505") {
        res.status(409).json({ error: "Conflict", message: "Kategori dengan nama & tipe ini sudah ada." });
        return;
      }
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    res.status(201).json({ data });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "MethodNotAllowed" });
}
