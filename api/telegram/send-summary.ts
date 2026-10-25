import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";
import { sendTelegramMessage } from "../_lib/telegram.js";
import { formatRupiah } from "../_lib/format.js";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "MethodNotAllowed" });
    return;
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { appUser } = ctx;

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
}

