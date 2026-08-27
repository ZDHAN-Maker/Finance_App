export const MAIN_KEYBOARD = {
  keyboard: [
    [{ text: "+ Pemasukan" }, { text: "- Pengeluaran" }],
    [{ text: "Cek Saldo" }, { text: "Bulan Ini" }],
    [{ text: "Riwayat" }, { text: "Statistik" }],
  ],
  resize_keyboard: true,
};

function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN belum diset di environment variables.");
  return token;
}

interface SendMessageOptions {
  replyMarkup?: unknown;
  parseMode?: "HTML" | "Markdown";
}

/**
 * Kirim pesan balasan ke chat Telegram tertentu.
 * Memakai fetch bawaan Node 18+ (tersedia di runtime Vercel Functions).
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string,
  options: SendMessageOptions = {}
): Promise<void> {
  const token = getBotToken();
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options.parseMode ?? "HTML",
      reply_markup: options.replyMarkup,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    // Sengaja tidak throw supaya kegagalan kirim pesan konfirmasi tidak
    // membuat webhook mengembalikan error ke Telegram (yang akan retry).
    console.error("Gagal mengirim pesan Telegram:", res.status, body);
  }
}

export interface TelegramUpdate {
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number };
    from?: { id: number; first_name?: string; username?: string };
  };
}
