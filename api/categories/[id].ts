import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  const id = req.query.id;
  if (typeof id !== "string") {
    res.status(400).json({ error: "BadRequest", message: "id kategori tidak valid." });
    return;
  }

  if (req.method === "PUT") {
    const { name } = req.body ?? {};
    if (!name || typeof name !== "string" || !name.trim()) {
      res.status(400).json({ error: "BadRequest", message: "name wajib diisi." });
      return;
    }

    // .eq("user_id", appUser.id) memastikan kategori global (user_id null)
    // tidak bisa diubah lewat endpoint ini.
    const { data, error } = await supabase
      .from("categories")
      .update({ name: name.trim().slice(0, 50) })
      .eq("id", id)
      .eq("user_id", appUser.id)
      .select("id, name, type, user_id")
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "NotFound", message: "Kategori tidak ditemukan atau bukan milik Anda." });
      return;
    }
    res.status(200).json({ data });
    return;
  }

  if (req.method === "DELETE") {
    const { error, count } = await supabase
      .from("categories")
      .delete({ count: "exact" })
      .eq("id", id)
      .eq("user_id", appUser.id);

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "NotFound", message: "Kategori tidak ditemukan atau bukan milik Anda." });
      return;
    }
    res.status(204).end();
    return;
  }

  res.setHeader("Allow", "PUT, DELETE");
  res.status(405).json({ error: "MethodNotAllowed" });
}
