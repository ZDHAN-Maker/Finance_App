import { useState } from "react";
import { formatRupiah } from "../utils/formatCurrency";
import { applyAiPlan, type AiBudgetPlan } from "../utils/aiPlanManager";
import { IconSparkle } from "./Icons";
import { useNavigate } from "react-router-dom";

interface AiPlanCardProps {
  plan: AiBudgetPlan;
  onApplied?: () => void;
}

export function AiPlanCard({ plan, onApplied }: AiPlanCardProps) {
  const [applied, setApplied] = useState(false);
  const navigate = useNavigate();

  function handleApply() {
    applyAiPlan(plan);
    setApplied(true);
    if (onApplied) onApplied();
  }

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-ledger-300 bg-white shadow-md">
      {/* Header */}
      <div className="flex items-center justify-between bg-ledger-500 px-3.5 py-2.5 text-white">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <IconSparkle width={13} height={13} className="text-white" />
          </div>
          <span className="text-xs font-semibold tracking-wide">Rancangan Siap Diterapkan</span>
        </div>
        <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white">
          AI Auto-Config
        </span>
      </div>

      {/* Body info */}
      <div className="p-3.5 text-xs text-ink-soft space-y-2.5">
        {plan.summary && (
          <p className="rounded-xl bg-ledger-50/70 p-2 text-[11px] font-medium leading-relaxed text-ledger-800 border border-ledger-200/60">
            💡 {plan.summary}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-xl border border-paper-line bg-paper/50 p-2">
            <p className="text-[10px] text-ink-faint uppercase font-medium">🎯 Target Tabungan</p>
            <p className="font-semibold text-ink mt-0.5 truncate">{plan.goalName}</p>
            <p className="font-mono font-bold text-ledger-600">{formatRupiah(plan.targetAmount)}</p>
          </div>

          <div className="rounded-xl border border-paper-line bg-paper/50 p-2">
            <p className="text-[10px] text-ink-faint uppercase font-medium">🛒 Batas Belanja Bulanan</p>
            <p className="font-semibold text-ink mt-0.5">Panduan Anggaran</p>
            <p className="font-mono font-bold text-rust-600">{formatRupiah(plan.monthlyBudgetLimit)}</p>
          </div>

          <div className="rounded-xl border border-paper-line bg-paper/50 p-2">
            <p className="text-[10px] text-ink-faint uppercase font-medium">🔄 Auto-Save Bulanan</p>
            <p className="font-semibold text-ink mt-0.5">Tiap Tgl {plan.recurringDay}</p>
            <p className="font-mono font-bold text-ledger-600">{formatRupiah(plan.recurringAmount)}</p>
          </div>

          <div className="rounded-xl border border-paper-line bg-paper/50 p-2">
            <p className="text-[10px] text-ink-faint uppercase font-medium">📅 Batas Waktu</p>
            <p className="font-semibold text-ink mt-0.5">Deadline</p>
            <p className="font-medium text-ink">
              {new Date(`${plan.deadline}T00:00:00`).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="border-t border-paper-line/70 pt-2 text-[10px] text-ink-faint space-y-0.5">
          <p>✨ Menyetujui ini akan otomatis menyetel:</p>
          <p>• <strong>Target Tabungan</strong> baru & jadwal setoran otomatis.</p>
          <p>• <strong>Panduan Belanja Harian</strong> & status kesehatan anggaran di Dashboard.</p>
        </div>
      </div>

      {/* Action Footer */}
      <div className="border-t border-paper-line bg-paper/40 p-2.5">
        {applied ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-center gap-1.5 rounded-xl bg-ledger-100 py-2 text-xs font-semibold text-ledger-700">
              <span>🎉 Berhasil Diterapkan ke Dashboard!</span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="text-center text-[11px] font-medium text-ledger-600 underline hover:text-ledger-800"
            >
              Lihat perubahan di Dashboard →
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleApply}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-ledger-500 py-2.5 text-xs font-semibold text-white shadow-xs transition-all hover:bg-ledger-600 active:scale-[0.98]"
          >
            <span>✅ Setujui & Terapkan ke Dashboard</span>
          </button>
        )}
      </div>
    </div>
  );
}

