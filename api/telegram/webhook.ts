import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSupabaseAdmin } from "../_lib/supabaseAdmin.js";
import { sendTelegramMessage, MAIN_KEYBOARD, TelegramUpdate } from "../_lib/telegram.js";
import { parseTransactionMessage, isParseError } from "../_lib/parser.js";
import { formatRupiah, currentMonthKey, monthKeyToRange } from "../_lib/format.js";

const HELP_TEXT = `<b>Perintah yang tersedia</b>

/saldo - lihat saldo saat ini
/bulan - ringkasan bulan ini
/riwayat - 5 transaksi terakhir
/link KODE - hubungkan akun Telegram ke dashboard
/bantuan - tampilkan pesan ini

Atau langsung kirim transaksi, contoh:
<code>30k bensin</code>
<code>gaji 5jt</code>`;

type AppUserRow = { id: string; name: string | null; telegram_id: number | null };

async function findUserByTelegramId(telegramId: number): Promise<AppUserRow | null> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("users")
    .select("id, name, telegram_id")
    .eq("telegram_id", telegramId)
    .maybeSingle();
  return data as AppUserRow | null;
}

async function handleLink(chatId: number, telegramId: number, rawCode: string) {
  const admin = getSupabaseAdmin();
  const code = rawCode.trim().toUpperCase();

  if (!code) {
    await sendTelegramMessage(chatId, "Format: <code>/link KODE</code>\nAmbil KODE dari halaman Pengaturan di dashboard.");
    return;
  }

  const { data: candidate } = await admin
    .from("users")
    .select("id, telegram_link_code_expires_at")
    .eq("telegram_link_code", code)
    .maybeSingle();

  const expired =
    !candidate?.telegram_link_code_expires_at ||
    new Date(candidate.telegram_link_code_expires_at).getTime() < Date.now();

  if (!candidate || expired) {
    await sendTelegramMessage(
      chatId,
      "⚠️ Kode tidak valid atau sudah kedaluwarsa. Buat kode baru dari halaman Pengaturan di dashboard, lalu coba lagi."
    );
    return;
  }

  const { error } = await admin
    .from("users")
    .update({ telegram_id: telegramId, telegram_link_code: null, telegram_link_code_expires_at: null })
    .eq("id", candidate.id);

  if (error) {
    const message = error.code === "23505"
      ? "⚠️ Akun Telegram ini sudah terhubung ke user lain."
      : "⚠️ Gagal menghubungkan akun, coba lagi.";
    await sendTelegramMessage(chatId, message);
    return;
  }

  await sendTelegramMessage(chatId, "✅ Telegram berhasil terhubung ke dashboard kamu!", {
    replyMarkup: MAIN_KEYBOARD,
  });
}

async function handleSaldo(chatId: number, userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.from("transactions").select("type, amount").eq("user_id", userId);

  if (error) {
    await sendTelegramMessage(chatId, "⚠️ Gagal mengambil data saldo, coba lagi.");
    return;
  }

  let income = 0;
  let expense = 0;
  for (const row of data ?? []) {
    if (row.type === "income") income += Number(row.amount);
    else expense += Number(row.amount);
  }

  await sendTelegramMessage(
    chatId,
    `💰 <b>Saldo kamu</b>\n\n<pre>Saldo       : ${formatRupiah(income - expense)}\nPemasukan   : ${formatRupiah(income)}\nPengeluaran : ${formatRupiah(expense)}</pre>`
  );
}

async function handleBulanIni(chatId: number, userId: string) {
  const admin = getSupabaseAdmin();
  const monthKey = currentMonthKey();
  const { start, end } = monthKeyToRange(monthKey);

  const { data, error } = await admin
    .from("transactions")
    .select("type, amount, categories(name)")
    .eq("user_id", userId)
    .gte("transaction_date", start)
    .lte("transaction_date", end);

  if (error) {
    await sendTelegramMessage(chatId, "⚠️ Gagal mengambil ringkasan bulan ini, coba lagi.");
    return;
  }

  let income = 0;
  let expense = 0;
  const expenseByCategory = new Map<string, number>();

  for (const row of data ?? []) {
    const amount = Number(row.amount);
    if (row.type === "income") {
      income += amount;
    } else {
      expense += amount;
      const categoryRow = row.categories as unknown as { name: string } | { name: string }[] | null;
      const name = Array.isArray(categoryRow) ? categoryRow[0]?.name : categoryRow?.name;
      const label = name ?? "Lainnya";
      expenseByCategory.set(label, (expenseByCategory.get(label) ?? 0) + amount);
    }
  }

  const top3 = Array.from(expenseByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name, amount], i) => `${i + 1}. ${name} - ${formatRupiah(amount)}`)
    .join("\n");

  const monthLabel = new Date(`${monthKey}-01T00:00:00`).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  await sendTelegramMessage(
    chatId,
    `📊 <b>Ringkasan ${monthLabel}</b>\n\n<pre>Pemasukan   : ${formatRupiah(income)}\nPengeluaran : ${formatRupiah(expense)}\nSisa        : ${formatRupiah(income - expense)}\nTransaksi   : ${data?.length ?? 0}</pre>${top3 ? `\n<b>Top pengeluaran:</b>\n${top3}` : ""}`
  );
}

async function handleRiwayat(chatId: number, userId: string) {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("transactions")
    .select("type, amount, description, transaction_date, categories(name)")
    .eq("user_id", userId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  if (error) {
    await sendTelegramMessage(chatId, "⚠️ Gagal mengambil riwayat, coba lagi.");
    return;
  }

  if (!data || data.length === 0) {
    await sendTelegramMessage(chatId, "Belum ada transaksi tercatat.");
    return;
  }

  const lines = data.map((row) => {
    const sign = row.type === "income" ? "+" : "-";
    const categoryRow = row.categories as unknown as { name: string } | { name: string }[] | null;
    const name = Array.isArray(categoryRow) ? categoryRow[0]?.name : categoryRow?.name;
    return `${sign} ${formatRupiah(Number(row.amount))}  ${row.description || name || ""}`;
  });

  await sendTelegramMessage(chatId, `🧾 <b>5 transaksi terakhir</b>\n\n<pre>${lines.join("\n")}</pre>`);
}

async function handleNewTransaction(chatId: number, userId: string, text: string) {
  const parsed = parseTransactionMessage(text);

  if (isParseError(parsed)) {
    await sendTelegramMessage(chatId, parsed.message);
    return;
  }

  const admin = getSupabaseAdmin();

  // Cari category_id: utamakan kategori custom milik user, fallback ke kategori global.
  const { data: categoryRows } = await admin
    .from("categories")
    .select("id, user_id")
    .eq("name", parsed.categoryName)
    .eq("type", parsed.type)
    .or(`user_id.eq.${userId},user_id.is.null`);

  const categoryId =
    categoryRows?.find((c) => c.user_id === userId)?.id ?? categoryRows?.find((c) => c.user_id === null)?.id ?? null;

  const { error } = await admin.from("transactions").insert({
    user_id: userId,
    category_id: categoryId,
    type: parsed.type,
    amount: parsed.amount,
    description: parsed.description,
    source: "telegram",
    transaction_date: new Date().toISOString().slice(0, 10),
  });

  if (error) {
    console.error("Gagal insert transaksi dari Telegram:", error.message);
    await sendTelegramMessage(chatId, "⚠️ Gagal menyimpan transaksi, coba lagi sebentar.");
    return;
  }

  const jenisLabel = parsed.type === "income" ? "Pemasukan" : "Pengeluaran";
  await sendTelegramMessage(
    chatId,
    `✅ <b>Transaksi dicatat</b>\n\n<pre>Jenis      : ${jenisLabel}\nNominal    : ${formatRupiah(parsed.amount)}\nKategori   : ${parsed.categoryName}\nKeterangan : ${parsed.description}</pre>`
  );
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "MethodNotAllowed" });
    return;
  }

  // Verifikasi webhook secret SEBELUM memproses apa pun (Bagian 6 & 10 dokumen).
  const secretHeader = req.headers["x-telegram-bot-api-secret-token"];
  if (secretHeader !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  // Selalu balas 200 setelah titik ini supaya Telegram tidak retry
  // bertubi-tubi hanya karena error internal kita — error dicatat ke log
  // dan (jika memungkinkan) diberitahukan ke user lewat chat.
  try {
    const update = req.body as TelegramUpdate;
    const message = update?.message;
    const text = message?.text?.trim();
    const chatId = message?.chat?.id;
    const telegramUserId = message?.from?.id;

    if (!message || !text || !chatId || !telegramUserId) {
      res.status(200).json({ ok: true });
      return;
    }

    const command = text.split(/\s+/)[0].split("@")[0].toLowerCase();

    if (command === "/start") {
      const existing = await findUserByTelegramId(telegramUserId);
      if (existing) {
        await sendTelegramMessage(chatId, `Halo lagi, ${existing.name ?? "👋"}! Mau catat apa hari ini?`, {
          replyMarkup: MAIN_KEYBOARD,
        });
      } else {
        await sendTelegramMessage(
          chatId,
          "👋 Selamat datang! Bot ini mencatat pemasukan/pengeluaran ke dashboard yang sama dengan akun web kamu.\n\n1. Login ke dashboard\n2. Buka menu Pengaturan → Hubungkan Telegram\n3. Kirim <code>/link KODE</code> di sini"
        );
      }
      return res.status(200).json({ ok: true });
    }

    if (command === "/link") {
      await handleLink(chatId, telegramUserId, text.slice(command.length).trim());
      return res.status(200).json({ ok: true });
    }

    if (command === "/bantuan" || command === "/help") {
      await sendTelegramMessage(chatId, HELP_TEXT);
      return res.status(200).json({ ok: true });
    }

    // Semua perintah di bawah ini butuh akun yang sudah tertaut.
    const appUser = await findUserByTelegramId(telegramUserId);
    if (!appUser) {
      await sendTelegramMessage(
        chatId,
        "⚠️ Akun Telegram ini belum terhubung ke dashboard.\nBuka Pengaturan di dashboard untuk mendapatkan kode, lalu kirim <code>/link KODE</code>."
      );
      return res.status(200).json({ ok: true });
    }

    if (command === "/saldo" || text === "Cek Saldo") {
      await handleSaldo(chatId, appUser.id);
    } else if (command === "/bulan" || text === "Bulan Ini" || text === "Statistik") {
      await handleBulanIni(chatId, appUser.id);
    } else if (command === "/riwayat" || text === "Riwayat") {
      await handleRiwayat(chatId, appUser.id);
    } else if (text === "+ Pemasukan") {
      await sendTelegramMessage(chatId, "Kirim nominal dan keterangan, contoh: <code>5jt gaji</code>");
    } else if (text === "- Pengeluaran") {
      await sendTelegramMessage(chatId, "Kirim nominal dan keterangan, contoh: <code>30k bensin</code>");
    } else if (text.startsWith("/")) {
      await sendTelegramMessage(chatId, "Perintah tidak dikenali. Kirim /bantuan untuk lihat daftar perintah.");
    } else {
      await handleNewTransaction(chatId, appUser.id, text);
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    // Tetap 200 supaya Telegram tidak mem-flood retry karena bug internal kita.
    res.status(200).json({ ok: true });
  }
}
