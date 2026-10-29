import { useState } from "react";
import type { JajanBudgetGuide } from "../utils/budgetInsight";
import { formatRupiah } from "../utils/formatCurrency";
import {
  sendBudgetLimitNotification,
  sendTelegramBudgetAlert,
  requestNotificationPermission,
  getNotificationPermission,
} from "../utils/notificationService";

interface Props {
  guide: JajanBudgetGuide;
  onUpdateBudgetLimit?: () => void;
}

export function DailyJajanCard({ guide, onUpdateBudgetLimit }: Props) {
  const [sendingNotif, setSendingNotif] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  async function handleSendDeviceNotif() {
    setSendingNotif(true);
    setNotifFeedback(null);
    try {
      const perm = getNotificationPermission();
      if (perm !== "granted") {
        const requested = await requestNotificationPermission();
        if (requested !== "granted") {
          setNotifFeedback("Izin notifikasi belum diaktifkan di browser/HP kamu.");
          return;
        }
      }

      const success = await sendBudgetLimitNotification(guide);
      if (success) {
        setNotifFeedback("✓ Notifikasi batasan terkirim ke HP!");
      } else {
        setNotifFeedback("Notifikasi dikirim. Pastikan izin notifikasi aktif.");
      }
    } catch {
      setNotifFeedback("Gagal memicu notifikasi perangkat.");
    } finally {
      setSendingNotif(false);
      setTimeout(() => setNotifFeedback(null), 4000);
    }
  }

  async function handleSendTelegramAlert() {
    setSendingNotif(true);
    setNotifFeedback(null);
    try {
      const res = await sendTelegramBudgetAlert(guide);
      if (res.success) {
        if (res.deviceNotifSent) {
          setNotifFeedback("✓ Berhasil dikirim ke Telegram & notifikasi HP telah muncul!");
        } else {
          setNotifFeedback("✓ Berhasil dikirim ke Telegram! (Aktifkan izin notifikasi HP untuk pop-up layar)");
        }
      } else {
        if (res.deviceNotifSent) {
          setNotifFeedback(`⚠️ Notifikasi HP muncul, tetapi Telegram gagal: ${res.message}`);
        } else {
          setNotifFeedback(res.message);
        }
      }
    } catch {
      setNotifFeedback("Gagal memproses notifikasi. Pastikan Telegram sudah terhubung.");
    } finally {
      setSendingNotif(false);
      setTimeout(() => setNotifFeedback(null), 5000);
    }
  }

  // Persentase pemakaian anggaran bulanan
  const monthlyPercent = Math.min(
    Math.round((guide.monthlyExpense / Math.max(guide.monthlyBudget, 1)) * 100),
    100
  );

  // Status badge styling
  const statusBadge = {
    aman: "bg-emerald-100 text-emerald-800 border-emerald-200",
    "hati-hati": "bg-amber-100 text-amber-800 border-amber-200",
    waspada: "bg-amber-100 text-amber-800 border-amber-200",
    "over-budget": "bg-rose-100 text-rose-800 border-rose-200",
  }[guide.jajanStatus];

  return (
    <div className="relative overflow-hidden rounded-card border border-paper-line bg-paper-card shadow-card transition-all">
      {/* Top Banner Header dengan sentuhan Maroon Crimson ala D'GYM */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-paper-line/70 bg-gradient-to-r from-ledger-50/90 via-ledger-50/40 to-transparent px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-ledger-600 text-white shadow-2xs">
            <span className="text-sm">🎯</span>
          </div>
          <div>
            <h2 className="text-sm font-semibold tracking-tight text-ink sm:text-base">
              Panduan Batasan & Jajan Hari Ini
            </h2>
            <p className="text-[11px] text-ink-faint">
              Sisa {guide.daysLeft} hari dalam siklus anggaran bulan ini
            </p>
          </div>
        </div>

        <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold capitalize ${statusBadge}`}>
          {guide.jajanStatus === "over-budget" ? "⚠️ Over Jajan" : guide.jajanStatus === "waspada" ? "⚡ Waspada" : "✓ Aman"}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        {/* Headline message */}
        <p className="mb-4 text-xs font-medium leading-relaxed text-ink-soft">
          {guide.headline}
        </p>

        {/* 3 Metrik Utama: Bulanan, Belanja Hari Ini, Jatah Jajan */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {/* Card 1: Batas Bulanan */}
          <div className="rounded-xl border border-paper-line/80 bg-paper/50 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-ink-faint">
              <span className="font-semibold uppercase tracking-wider">Batas Bulanan</span>
              <span>{monthlyPercent}%</span>
            </div>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-ink">
              {formatRupiah(guide.monthlyBudget)}
            </p>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-paper-line">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  monthlyPercent > 90 ? "bg-rose-500" : monthlyPercent > 70 ? "bg-amber-500" : "bg-ledger-600"
                }`}
                style={{ width: `${monthlyPercent}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[10px] text-ink-faint">
              <span>Terpakai: {formatRupiah(guide.monthlyExpense)}</span>
              <span className="font-medium text-ledger-600">Sisa: {formatRupiah(guide.remainingMonthlyBudget)}</span>
            </div>
          </div>

          {/* Card 2: Batas Belanja Hari Ini */}
          <div className="rounded-xl border border-paper-line/80 bg-paper/50 p-3.5">
            <div className="flex items-center justify-between text-[11px] text-ink-faint">
              <span className="font-semibold uppercase tracking-wider">Belanja Hari Ini</span>
              <span className="text-ledger-600 font-medium">Batas aman</span>
            </div>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-ink">
              {formatRupiah(guide.dailyTotalLimit)}
              <span className="text-[11px] font-normal text-ink-faint"> /hari</span>
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-paper-line pt-2 text-[11px]">
              <span className="text-ink-faint">Sudah keluar:</span>
              <span className="font-mono font-medium text-ink">{formatRupiah(guide.todayTotalSpent)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-ink-faint">Sisa belanja:</span>
              <span className="font-mono font-semibold text-emerald-700">{formatRupiah(guide.todayTotalRemaining)}</span>
            </div>
          </div>

          {/* Card 3: Jatah Jajan Hari Ini */}
          <div className={`rounded-xl border p-3.5 transition-colors ${
            guide.jajanStatus === "over-budget"
              ? "border-rose-300 bg-rose-50/70"
              : guide.jajanStatus === "waspada"
                ? "border-amber-300 bg-amber-50/60"
                : "border-ledger-200 bg-ledger-50/40"
          }`}>
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold uppercase tracking-wider text-ledger-700">Jatah Uang Jajan</span>
              <span className="text-xs">☕</span>
            </div>
            <p className="mt-1 font-mono text-base font-bold tabular-nums text-ledger-900">
              {formatRupiah(guide.dailyJajanLimit)}
              <span className="text-[11px] font-normal text-ink-faint"> /hari</span>
            </p>
            <div className="mt-2 flex items-center justify-between border-t border-dashed border-paper-line pt-2 text-[11px]">
              <span className="text-ink-faint">Jajan hari ini:</span>
              <span className="font-mono font-medium text-ink">{formatRupiah(guide.todayJajanSpent)}</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px]">
              <span className="text-ink-faint">Sisa jajan:</span>
              <span className={`font-mono font-bold ${guide.todayJajanRemaining < 0 ? "text-rose-600" : "text-ledger-600"}`}>
                {guide.todayJajanRemaining >= 0
                  ? formatRupiah(guide.todayJajanRemaining)
                  : `-${formatRupiah(Math.abs(guide.todayJajanRemaining))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Feedback banner */}
        {notifFeedback && (
          <div className="mt-3.5 rounded-lg border border-ledger-200 bg-ledger-50 px-3 py-2 text-xs font-medium text-ledger-800 transition-all animate-fadeIn">
            {notifFeedback}
          </div>
        )}

        {/* Action Button Row: Push to Phone, Push to Telegram, Edit Budget */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-paper-line pt-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSendDeviceNotif}
              disabled={sendingNotif}
              className="inline-flex items-center gap-1.5 rounded-lg border border-paper-line bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-paper active:scale-95 disabled:opacity-50 transition-all"
              title="Kirim notifikasi langsung ke layar HP"
            >
              <span>🔔</span>
              <span>Notifikasi HP</span>
            </button>

            <button
              type="button"
              onClick={handleSendTelegramAlert}
              disabled={sendingNotif}
              className="inline-flex items-center gap-1.5 rounded-lg bg-ledger-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-ledger-700 active:scale-95 disabled:opacity-50 transition-all"
              title="Kirim laporan ringkas ke Telegram & munculkan notifikasi batasan di layar HP"
            >
              <span>📲</span>
              <span>Kirim ke Telegram & HP</span>
            </button>
          </div>

          {onUpdateBudgetLimit && (
            <button
              type="button"
              onClick={onUpdateBudgetLimit}
              className="text-xs font-semibold text-ledger-600 hover:text-ledger-700 underline"
            >
              Ubah Batas Anggaran
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

