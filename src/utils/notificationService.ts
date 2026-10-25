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
  if (!isNotificationSupported() || Notification.permission !== "granted") {
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
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, defaultOptions);
        return true;
      }
    }
    // Fallback standard window.Notification
    new Notification(title, defaultOptions);
    return true;
  } catch (err) {
    console.warn("Gagal menampilkan notifikasi perangkat:", err);
    return false;
  }
}

/**
 * Mengirim notifikasi batasan keuangan & jajan ke HP.
 */
export async function sendBudgetLimitNotification(guide: JajanBudgetGuide): Promise<boolean> {
  const title = `💰 Batasan Keuangan & Jajan Hari Ini`;
  const body =
    `Batas belanja hari ini: ${formatRupiah(guide.dailyTotalLimit)} (Sisa: ${formatRupiah(guide.todayTotalRemaining)}).\n` +
    `Jatah jajan: ${formatRupiah(guide.dailyJajanLimit)}/hari (Sisa jajan hari ini: ${formatRupiah(Math.max(guide.todayJajanRemaining, 0))}).`;

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
 * Mengirim ringkasan lengkap ke Telegram bot HP user.
 */
export async function sendTelegramBudgetAlert(guide: JajanBudgetGuide): Promise<{ success: boolean; message: string }> {
  try {
    const res = await api.post<{ success: boolean; message: string }>("/telegram/send-summary", {
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
      message: res?.message ?? "Ringkasan berhasil dikirim ke Telegram kamu!",
    };
  } catch (err) {
    const errorMsg = (err as Error).message || "Gagal mengirim ke Telegram.";
    return { success: false, message: errorMsg };
  }
}
