import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { requireUser } from "../_lib/auth.js";

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 15;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I biar tidak ambigu

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];
  }
  return code;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  if (req.method === "POST") {
    if (appUser.telegram_id) {
      res.status(409).json({
        error: "AlreadyLinked",
        message: "Akun Telegram sudah terhubung. Putuskan dulu jika ingin ganti.",
      });
      return;
    }

    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000).toISOString();

    // Coba beberapa kali kalau kebetulan kode bentrok (unique constraint).
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await supabase
        .from("users")
        .update({ telegram_link_code: code, telegram_link_code_expires_at: expiresAt })
        .eq("id", appUser.id)
        .select("telegram_link_code, telegram_link_code_expires_at")
        .single();

      if (!error && data) {
        res.status(200).json({
          data: {
            code: data.telegram_link_code,
            expires_at: data.telegram_link_code_expires_at,
            bot_username: process.env.TELEGRAM_BOT_USERNAME ?? null,
            instructions: `Buka chat dengan bot Telegram lalu kirim: /link ${data.telegram_link_code}`,
          },
        });
        return;
      }
      lastError = error;
    }

    res.status(500).json({
      error: "DatabaseError",
      message: (lastError as Error)?.message ?? "Gagal membuat kode link, coba lagi.",
    });
    return;
  }

  if (req.method === "DELETE") {
    const { error } = await supabase
      .from("users")
      .update({ telegram_id: null, telegram_link_code: null, telegram_link_code_expires_at: null })
      .eq("id", appUser.id);

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    res.status(200).json({ data: { telegram_connected: false } });
    return;
  }

  res.setHeader("Allow", "POST, DELETE");
  res.status(405).json({ error: "MethodNotAllowed" });
}
