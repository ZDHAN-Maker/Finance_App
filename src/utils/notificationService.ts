import type { JajanBudgetGuide } from "./budgetInsight";
import { formatRupiah } from "./formatCurrency";
import { api } from "../services/api";

const NOTIF_DATE_KEY = "kas-last-notif-date";

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return await Notification.requestPermission();
}

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }
  return Notification.permission;
}

/**
 * Mengirim notifikasi lokal ke HP (via Service Worker PWA atau Notification API).
 */
export async function sendDeviceNotification(title: string, options: NotificationOptions = {}): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  // Jika izin belum diberikan, coba minta izin terlebih dahulu
  if (Notification.permission === "default") {
    const perm = await requestNotificationPermission();
    if (perm !== "granted") return false;
  } else if (Notification.permission !== "granted") {
    return false;
  }

  const defaultOptions: NotificationOptions = {
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    ...options,
  };

  try {
    // Utamakan Service Worker registration (didukung di PWA Android/Mobile)
    if ("serviceWorker" in navigator) {
      try {
        const reg = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200)),
        ]);
        if (reg && "showNotification" in reg) {
          await reg.showNotification(title, defaultOptions);
          return true;
        }
      } catch (swErr) {
        console.warn("SW showNotification gagal, beralih ke window.Notification:", swErr);
      }
    }
    // Fallback standard window.Notification
    if (typeof Notification !== "undefined") {
      new Notification(title, defaultOptions);
      return true;
    }
    return false;
  } catch (err) {
    console.warn("Gagal menampilkan notifikasi perangkat:", err);
    return false;
  }
}

/**
 * Mengirim notifikasi batasan keuangan & jajan ke HP.
 */
export async function sendBudgetLimitNotification(guide: JajanBudgetGuide): Promise<boolean> {
  const statusLabel =
    guide.jajanStatus === "over-budget"
      ? "⚠️ Over Budget!"
      : guide.jajanStatus === "waspada"
      ? "⚡ Waspada Jajan"
      : "✓ Anggaran Aman";

  const title = `💰 Batasan Keuangan & Jajan (${statusLabel})`;
  const sisaJajanStr =
    guide.todayJajanRemaining >= 0
      ? formatRupiah(guide.todayJajanRemaining)
      : `-${formatRupiah(Math.abs(guide.todayJajanRemaining))}`;

  const body =
    `Batas belanja hari ini: ${formatRupiah(guide.dailyTotalLimit)} (Sisa: ${formatRupiah(guide.todayTotalRemaining)}).\n` +
    `Jatah jajan: ${formatRupiah(guide.dailyJajanLimit)}/hari (Sisa jajan hari ini: ${sisaJajanStr}).\n` +
    `Sisa hari: ${guide.daysLeft} hari lagi bulan ini.`;

  return sendDeviceNotification(title, {
    body,
    tag: `budget-daily-${new Date().toISOString().slice(0, 10)}`,
    data: { url: "/dashboard" },
  });
}

/**
 * Cek dan kirim briefing otomatis satu kali sehari saat user membuka aplikasi di HP.
 */
export async function checkAndSendDailyBriefing(guide: JajanBudgetGuide): Promise<void> {
  if (typeof window === "undefined") return;
  const todayStr = new Date().toISOString().slice(0, 10);
  const lastSent = localStorage.getItem(NOTIF_DATE_KEY);

  if (lastSent !== todayStr && Notification.permission === "granted") {
    const success = await sendBudgetLimitNotification(guide);
    if (success) {
      localStorage.setItem(NOTIF_DATE_KEY, todayStr);
    }
  }
}

/**
 * Mengirim ringkasan lengkap ke Telegram bot HP user,
 * SEKALIGUS memicu notifikasi pop-up di layar HP.
 */
export async function sendTelegramBudgetAlert(
  guide: JajanBudgetGuide,
  options: { triggerDeviceNotif?: boolean } = { triggerDeviceNotif: true }
): Promise<{ success: boolean; deviceNotifSent: boolean; message: string }> {
  // 1. Munculkan notifikasi ke layar HP secara bersamaan jika diaktifkan
  let deviceNotifSent = false;
  if (options.triggerDeviceNotif !== false && isNotificationSupported()) {
    try {
      deviceNotifSent = await sendBudgetLimitNotification(guide);
    } catch (e) {
      console.warn("Gagal menampilkan notifikasi perangkat saat trigger Telegram:", e);
    }
  }

  // 2. Kirim pesan ke bot Telegram
  try {
    const res = await api.put<{ success: boolean; message: string }>("/auth/telegram-link", {
      monthlyBudget: guide.monthlyBudget,
      monthlyExpense: guide.monthlyExpense,
      remainingMonthlyBudget: guide.remainingMonthlyBudget,
      dailyTotalLimit: guide.dailyTotalLimit,
      todayTotalRemaining: guide.todayTotalRemaining,
      dailyJajanLimit: guide.dailyJajanLimit,
      todayJajanRemaining: guide.todayJajanRemaining,
      todayJajanSpent: guide.todayJajanSpent,
      daysLeft: guide.daysLeft,
      headline: guide.headline,
    });
    return {
      success: res?.success ?? true,
      deviceNotifSent,
      message: res?.message ?? "Ringkasan berhasil dikirim ke Telegram kamu!",
    };
  } catch (err) {
    const errorMsg = (err as Error).message || "Gagal mengirim ke Telegram.";
    return { success: false, deviceNotifSent, message: errorMsg };
  }
}

