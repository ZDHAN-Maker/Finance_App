import type { VercelRequest, VercelResponse } from "@vercel/node";
import crypto from "node:crypto";
import { requireUser } from "../_lib/auth.js";
import { sendTelegramMessage } from "../_lib/telegram.js";
import { formatRupiah } from "../_lib/format.js";

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

  if (req.method === "PUT") {
    if (!appUser.telegram_id) {
      res.status(400).json({
        error: "TelegramNotLinked",
        message: "Akun Telegram belum terhubung. Buka menu Pengaturan di web untuk menghubungkan akun Telegram Anda.",
      });
      return;
    }

    const body = req.body ?? {};
    const monthlyBudget = Number(body.monthlyBudget ?? 0);
    const monthlyExpense = Number(body.monthlyExpense ?? 0);
    const remainingMonthlyBudget = Number(body.remainingMonthlyBudget ?? 0);
    const dailyTotalLimit = Number(body.dailyTotalLimit ?? 0);
    const todayTotalRemaining = Number(body.todayTotalRemaining ?? 0);
    const dailyJajanLimit = Number(body.dailyJajanLimit ?? 0);
    const todayJajanSpent = Number(body.todayJajanSpent ?? 0);
    const todayJajanRemaining = Number(body.todayJajanRemaining ?? 0);
    const daysLeft = Number(body.daysLeft ?? 1);
    const headline = String(body.headline ?? "");

    const text = `📊 <b>Ringkasan Batasan Keuangan & Jajan</b>
<i>D'Cash Personal Finance</i>

📅 <b>Sisa Periode:</b> ${daysLeft} hari lagi bulan ini

💳 <b>Batas Bulanan:</b>
• Anggaran : ${formatRupiah(monthlyBudget)}
• Terpakai : ${formatRupiah(monthlyExpense)}
• Sisa Kas : <b>${formatRupiah(remainingMonthlyBudget)}</b>

🛒 <b>Batas Belanja Hari Ini:</b>
• Alokasi aman : ${formatRupiah(dailyTotalLimit)} / hari
• Sisa hari ini : <b>${formatRupiah(todayTotalRemaining)}</b>

☕ <b>Jatah Uang Jajan Hari Ini:</b>
• Kuota jajan : ${formatRupiah(dailyJajanLimit)} / hari
• Jajan hari ini : ${formatRupiah(todayJajanSpent)}
• Sisa jajan : <b>${formatRupiah(Math.max(todayJajanRemaining, 0))}</b>

${headline}`;

    try {
      await sendTelegramMessage(appUser.telegram_id, text);
      res.status(200).json({
        success: true,
        message: "Notifikasi batasan keuangan berhasil dikirim ke Telegram kamu!",
      });
    } catch (err) {
      console.error("Gagal mengirim Telegram summary:", err);
      res.status(500).json({
        error: "TelegramSendError",
        message: "Gagal mengirim notifikasi ke Telegram.",
      });
    }
    return;
  }

  res.setHeader("Allow", "POST, PUT, DELETE");
  res.status(405).json({ error: "MethodNotAllowed" });
}
