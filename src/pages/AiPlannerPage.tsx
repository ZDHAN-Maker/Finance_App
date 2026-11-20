import { useState, useRef, useEffect } from "react";
import { Layout } from "../components/Layout";
import { formatRupiah } from "../utils/formatCurrency";
import { IconSparkle } from "../components/Icons";
import { parseAiPlanFromText, stripPlanBlockFromText, type AiBudgetPlan } from "../utils/aiPlanManager";
import { AiPlanCard } from "../components/AiPlanCard";
import {
  calculateSmartBudgetPlan,
  type BudgetBreakdown,
  type BudgetScenario,
  type SmartPlanResult,
} from "../services/smartBudgetEngine";

// Simple markdown renderer (bold, headers, lists, tables, inline code)
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-semibold text-ink mt-4 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold text-ink mt-5 mb-2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-ink mt-5 mb-2">$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold text-ink">$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, '<code class="rounded bg-paper px-1 py-0.5 font-mono text-xs text-ledger-700">$1</code>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr class="my-3 border-paper-line" />')
    // Table rows (basic)
    .replace(/\| (.+?) \|/g, '<span class="inline-block px-1">$1</span>')
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, '<li class="ml-4 list-disc text-ink-soft">$1</li>')
    // Numbered list items
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-ink-soft">$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[\s\S]+?<\/li>)(\n<li)/g, "$1$2")
    // Line breaks (double newline → paragraph break, single → <br>)
    .replace(/\n\n/g, '</p><p class="mt-2 text-sm text-ink-soft">')
    .replace(/\n/g, "<br />");
}

const GOAL_PRESETS = [
  {
    emoji: "🏍️",
    label: "Motor Impian",
    itemName: "Motor Baru",
    targetPrice: "24000000",
    suggestedMonths: 12,
  },
  {
    emoji: "📱",
    label: "HP / Gadget",
    itemName: "HP Baru",
    targetPrice: "6000000",
    suggestedMonths: 6,
  },
  {
    emoji: "✈️",
    label: "Liburan",
    itemName: "Liburan ke Bali",
    targetPrice: "7500000",
    suggestedMonths: 5,
  },
  {
    emoji: "🏠",
    label: "DP Rumah",
    itemName: "DP Rumah",
    targetPrice: "35000000",
    suggestedMonths: 24,
  },
  {
    emoji: "💍",
    label: "Dana Nikah",
    itemName: "Dana Pernikahan",
    targetPrice: "30000000",
    suggestedMonths: 18,
  },
  {
    emoji: "💻",
    label: "Laptop Kerja",
    itemName: "Laptop Kerja",
    targetPrice: "12000000",
    suggestedMonths: 8,
  },
];

const MONTH_OPTIONS = [
  { label: "Otomatis", value: 0 },
  { label: "6 Bulan", value: 6 },
  { label: "10 Bulan", value: 10 },
  { label: "12 Bulan (1 Thn)", value: 12 },
  { label: "18 Bulan", value: 18 },
  { label: "24 Bulan (2 Thn)", value: 24 },
];

export function AiPlannerPage() {
  // Form state
  const [itemName, setItemName] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [targetMonths, setTargetMonths] = useState<number>(0);
  const [lifestyleMode, setLifestyleMode] = useState<"aggressive" | "balanced" | "relaxed">("balanced");
  const [notes, setNotes] = useState("");

  // Result state
  const [planResult, setPlanResult] = useState<SmartPlanResult | null>(null);
  const [activePlan, setActivePlan] = useState<AiBudgetPlan | null>(null);
  const [activeBreakdown, setActiveBreakdown] = useState<BudgetBreakdown | null>(null);
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (planResult && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [planResult]);

  function handleReset() {
    setItemName("");
    setTargetPrice("");
    setMonthlyIncome("");
    setMonthlyExpense("");
    setCurrentSavings("");
    setTargetMonths(0);
    setLifestyleMode("balanced");
    setNotes("");
    setPlanResult(null);
    setActivePlan(null);
    setActiveBreakdown(null);
    setError(null);
  }

  function handleCalculate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);

    const price = Number(targetPrice);
    const income = Number(monthlyIncome);

    if (!itemName.trim()) {
      setError("Nama tujuan tabungan (misal: Motor Baru, HP, dll.) wajib diisi.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Harga target tabungan harus lebih dari Rp 0.");
      return;
    }
    if (!Number.isFinite(income) || income <= 0) {
      setError("Pemasukan / gaji bulanan harus lebih dari Rp 0.");
      return;
    }

    setLoading(true);

    // Kalkulasi instan menggunakan Smart Financial Engine
    try {
      const res = calculateSmartBudgetPlan({
        itemName: itemName.trim(),
        targetPrice: price,
        monthlyIncome: income,
        monthlyExpense: monthlyExpense ? Number(monthlyExpense) : 0,
        currentSavings: currentSavings ? Number(currentSavings) : 0,
        targetMonths: targetMonths > 0 ? targetMonths : undefined,
        lifestyleMode,
        notes: notes.trim() || undefined,
      });

      setPlanResult(res);
      setActivePlan(res.planData);
      setActiveBreakdown(res.breakdown);
    } catch (err) {
      setError((err as Error).message ?? "Terjadi kesalahan saat menghitung rencana.");
    } finally {
      setLoading(false);
    }
  }

  // Mengubah pilihan skenario secara instan
  function applyScenario(scenario: BudgetScenario) {
    if (!planResult || !activeBreakdown) return;

    const remaining = activeBreakdown.remainingTarget;
    const newSavings = scenario.monthlySavings;
    const newMonths = scenario.months;
    const newJajan = scenario.monthlyJajan;
    const newDailyJajan = scenario.dailyJajan;

    // Recalculate deadline
    const d = new Date();
    d.setMonth(d.getMonth() + newMonths);
    const newDeadline = d.toISOString().slice(0, 10);

    const updatedPlan: AiBudgetPlan = {
      ...planResult.planData,
      deadline: newDeadline,
      recurringAmount: newSavings,
      monthlyBudgetLimit: activeBreakdown.livingNeeds + newJajan,
      summary: `Target ${itemName}: Nabung ${formatRupiah(newSavings)}/bln (${scenario.name}) selama ${newMonths} bln. Batas jajan ${formatRupiah(newDailyJajan)}/hari.`,
    };

    setActivePlan(updatedPlan);
    setActiveBreakdown({
      ...activeBreakdown,
      targetSavingsMonthly: newSavings,
      targetSavingsWeekly: Math.round(newSavings / 4),
      targetSavingsDaily: Math.round(newSavings / 30),
      jajanMonthly: newJajan,
      jajanWeekly: Math.floor(newJajan / 4),
      jajanDaily: newDailyJajan,
      monthsToReach: newMonths,
      deadlineDate: newDeadline,
    });
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ledger-500 text-white shadow-sm">
          <IconSparkle width={22} height={22} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Smart Financial Planner</h1>
          <p className="text-xs text-ink-faint">
            Kalkulator anggaran impian otomatis — presisi hingga ke batas uang jajan harian
          </p>
        </div>
      </div>

      {/* Preset Chips */}
      <section className="mb-4">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          💡 Rekomendasi Target Populer
        </p>
        <div className="flex flex-wrap gap-2">
          {GOAL_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setItemName(preset.itemName);
                setTargetPrice(preset.targetPrice);
                if (!monthlyIncome) setMonthlyIncome("5000000");
                setTargetMonths(preset.suggestedMonths);
                setPlanResult(null);
                setActivePlan(null);
                setError(null);
              }}
              className="flex items-center gap-1.5 rounded-full border border-ledger-200 bg-white px-3 py-1.5 text-xs font-medium text-ledger-800 shadow-2xs hover:bg-ledger-50 transition-colors"
            >
              <span>{preset.emoji}</span>
              <span>{preset.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Form Card */}
      <section className="rounded-card border border-paper-line bg-paper-card p-5 shadow-2xs">
        <form onSubmit={handleCalculate} className="space-y-4">
          {/* Target Item Name */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">
              Apa yang ingin kamu beli / capai? *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: Motor Honda Vario 160, HP Baru, Liburan Bali"
              className="w-full rounded-xl border border-paper-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ledger-500 focus:outline-none focus:ring-2 focus:ring-ledger-200"
            />
          </div>

          {/* Target Price & Monthly Income */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Estimasi Harga Target (Rp) *
              </label>
              <input
                type="number"
                min={1}
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="25000000"
                className="w-full rounded-xl border border-paper-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ledger-500 focus:outline-none focus:ring-2 focus:ring-ledger-200"
              />
              {targetPrice && Number(targetPrice) > 0 && (
                <p className="mt-1 text-[11px] font-medium text-ledger-700">
                  {formatRupiah(Number(targetPrice))}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink">
                Gaji Bersih / Pemasukan Bulanan (Rp) *
              </label>
              <input
                type="number"
                min={1}
                value={monthlyIncome}
                onChange={(e) => setMonthlyIncome(e.target.value)}
                placeholder="5000000"
                className="w-full rounded-xl border border-paper-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ledger-500 focus:outline-none focus:ring-2 focus:ring-ledger-200"
              />
              {monthlyIncome && Number(monthlyIncome) > 0 && (
                <p className="mt-1 text-[11px] font-medium text-ledger-700">
                  {formatRupiah(Number(monthlyIncome))}
                </p>
              )}
            </div>
          </div>

          {/* Routine Expenses & Current Savings */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                Kebutuhan Pokok Wajib / Bulan (Rp)
                <span className="text-[10px] text-ink-faint ml-1 font-normal">(Kost, beras, tagihan)</span>
              </label>
              <input
                type="number"
                min={0}
                value={monthlyExpense}
                onChange={(e) => setMonthlyExpense(e.target.value)}
                placeholder="Biarkan 0 untuk estimasi otomatis"
                className="w-full rounded-xl border border-paper-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ledger-500 focus:outline-none focus:ring-2 focus:ring-ledger-200"
              />
              {monthlyExpense && Number(monthlyExpense) > 0 && (
                <p className="mt-1 text-[11px] text-ink-faint">{formatRupiah(Number(monthlyExpense))}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                Tabungan yang Sudah Ada (Rp)
                <span className="text-[10px] text-ink-faint ml-1 font-normal">(Modal awal)</span>
              </label>
              <input
                type="number"
                min={0}
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                placeholder="0"
                className="w-full rounded-xl border border-paper-line bg-white px-3.5 py-2.5 text-sm text-ink focus:border-ledger-500 focus:outline-none focus:ring-2 focus:ring-ledger-200"
              />
              {currentSavings && Number(currentSavings) > 0 && (
                <p className="mt-1 text-[11px] text-ink-faint">{formatRupiah(Number(currentSavings))}</p>
              )}
            </div>
          </div>

          {/* Target Months Selector */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">
              Target Waktu Pembelian:
            </label>
            <div className="flex flex-wrap gap-2">
              {MONTH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTargetMonths(opt.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    targetMonths === opt.value
                      ? "bg-ledger-600 text-white shadow-xs font-semibold"
                      : "border border-paper-line bg-white text-ink-soft hover:bg-paper"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lifestyle / Discipline Mode */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-ink">
              Mode Gaya Hidup & Menabung:
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setLifestyleMode("aggressive")}
                className={`rounded-xl border p-2.5 text-left transition-all ${
                  lifestyleMode === "aggressive"
                    ? "border-ledger-500 bg-ledger-50/70 ring-1 ring-ledger-400"
                    : "border-paper-line bg-white hover:bg-paper/40"
                }`}
              >
                <div className="text-xs font-semibold text-ink">⚡ Agresif</div>
                <div className="text-[10px] text-ink-faint mt-0.5 leading-tight">
                  Nabung cepat, jajan sangat hemat
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLifestyleMode("balanced")}
                className={`rounded-xl border p-2.5 text-left transition-all ${
                  lifestyleMode === "balanced"
                    ? "border-ledger-500 bg-ledger-50/70 ring-1 ring-ledger-400"
                    : "border-paper-line bg-white hover:bg-paper/40"
                }`}
              >
                <div className="text-xs font-semibold text-ink">⚖️ Seimbang</div>
                <div className="text-[10px] text-ink-faint mt-0.5 leading-tight">
                  Tabungan pas & jajan tetap nyaman
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLifestyleMode("relaxed")}
                className={`rounded-xl border p-2.5 text-left transition-all ${
                  lifestyleMode === "relaxed"
                    ? "border-ledger-500 bg-ledger-50/70 ring-1 ring-ledger-400"
                    : "border-paper-line bg-white hover:bg-paper/40"
                }`}
              >
                <div className="text-xs font-semibold text-ink">☕ Santai</div>
                <div className="text-[10px] text-ink-faint mt-0.5 leading-tight">
                  Jajan longgar, waktu tabung lebih lama
                </div>
              </button>
            </div>
          </div>

          {/* Notes (Optional) */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Catatan Tambahan (Opsional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: ada cicilan motor 300rb yang baru selesai bulan depan..."
              className="w-full rounded-xl border border-paper-line bg-white px-3.5 py-2 text-xs text-ink focus:border-ledger-500 focus:outline-none focus:ring-2 focus:ring-ledger-200 resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl bg-rust-50 p-3 text-xs text-rust-800 border border-rust-200">
              <span className="font-semibold">⚠️ {error}</span>
            </div>
          )}

          {/* Submit Action Buttons */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ledger-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-ledger-600 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              <IconSparkle width={18} height={18} />
              <span>Hitung & Rancang Anggaran Cerdas</span>
            </button>

            {(planResult || error) && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-paper-line bg-paper px-4 py-3 text-sm font-medium text-ink-soft hover:bg-paper-line transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </section>

      {/* RESULT SECTION */}
      {planResult && activeBreakdown && activePlan && (
        <section ref={resultRef} className="mt-6 space-y-4">
          {/* Status Kelayakan Card */}
          <div
            className={`rounded-2xl border p-4.5 shadow-2xs transition-all ${
              activeBreakdown.feasibility === "easy" || activeBreakdown.feasibility === "realistic"
                ? "border-ledger-200 bg-ledger-50/50"
                : "border-amber-200 bg-amber-50/50"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                      activeBreakdown.feasibility === "easy" || activeBreakdown.feasibility === "realistic"
                        ? "bg-ledger-600 text-white"
                        : "bg-amber-600 text-white"
                    }`}
                  >
                    {activeBreakdown.feasibilityLabel}
                  </span>
                  <span className="text-xs font-semibold text-ink">
                    Target: {activeBreakdown.monthsToReach} Bulan
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-ink-soft">
                  {activeBreakdown.feasibilityNote}
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-ink-faint">Perkiraan Tercapai</span>
                <p className="text-sm font-bold text-ledger-800">
                  {new Date(activeBreakdown.deadlineDate).toLocaleDateString("id-ID", {
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* BEDAH UANG JAJAN HARIAN & MINGGUAN (HIGHLIGHT UTAMA) */}
          <div className="overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-amber-200/60">
              <div className="flex items-center gap-2">
                <span className="text-xl">☕</span>
                <div>
                  <h3 className="text-sm font-bold text-amber-950">
                    Batas Kuota Uang Jajan & Nongkrong
                  </h3>
                  <p className="text-[11px] text-amber-800">
                    Jaga pengeluaran jajan tetap di batas ini agar target {itemName} tidak gagal!
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-800 border border-amber-300">
                Daily Pocket Cap
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {/* Jajan Harian */}
              <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  ☀️ Batas Jajan Harian
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-amber-900">
                  {formatRupiah(activeBreakdown.jajanDaily)}
                </p>
                <p className="text-[10px] text-ink-faint mt-0.5">Maksimal per hari</p>
              </div>

              {/* Jajan Mingguan */}
              <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  📅 Kuota Jajan Mingguan
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-amber-900">
                  {formatRupiah(activeBreakdown.jajanWeekly)}
                </p>
                <p className="text-[10px] text-ink-faint mt-0.5">Per minggu (7 hari)</p>
              </div>

              {/* Jajan Bulanan */}
              <div className="col-span-2 sm:col-span-1 rounded-xl border border-amber-200 bg-white p-3 shadow-2xs">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                  🛍️ Total Jajan Bulanan
                </p>
                <p className="mt-1 font-mono text-xl font-bold text-amber-900">
                  {formatRupiah(activeBreakdown.jajanMonthly)}
                </p>
                <p className="text-[10px] text-ink-faint mt-0.5">
                  {Math.round((activeBreakdown.jajanMonthly / activeBreakdown.monthlyIncome) * 100)}% dari gaji
                </p>
              </div>
            </div>

            {/* Tips Jajan Cerdas */}
            <div className="mt-4 rounded-xl bg-amber-100/60 p-3 border border-amber-200/80">
              <p className="text-xs font-bold text-amber-900 mb-1.5 flex items-center gap-1.5">
                <span>💡</span> Strategi Belanja & Jajan Cerdas:
              </p>
              <ul className="space-y-1 text-[11px] leading-relaxed text-amber-950">
                {activeBreakdown.jajanTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ALOKASI ANGGARAN LENGKAP */}
          <div className="rounded-2xl border border-paper-line bg-paper-card p-5 shadow-2xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink">📊 Pembagian Alokasi Gaji Bulanan</h3>
              <p className="text-xs text-ink-faint">
                Total pemasukan: {formatRupiah(activeBreakdown.monthlyIncome)} / bulan
              </p>
            </div>

            {/* Visual Progress Bar */}
            <div className="h-4 w-full overflow-hidden rounded-full bg-paper flex shadow-inner">
              {/* Tabungan */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (activeBreakdown.targetSavingsMonthly / activeBreakdown.monthlyIncome) * 100
                  )}%`,
                }}
                className="bg-ledger-500 transition-all"
                title="Tabungan Target"
              />
              {/* Kebutuhan Pokok */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (activeBreakdown.livingNeeds / activeBreakdown.monthlyIncome) * 100
                  )}%`,
                }}
                className="bg-slate-500 transition-all"
                title="Kebutuhan Pokok"
              />
              {/* Dana Darurat */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (activeBreakdown.emergencyBuffer / activeBreakdown.monthlyIncome) * 100
                  )}%`,
                }}
                className="bg-indigo-400 transition-all"
                title="Dana Darurat"
              />
              {/* Uang Jajan */}
              <div
                style={{
                  width: `${Math.min(
                    100,
                    (activeBreakdown.jajanMonthly / activeBreakdown.monthlyIncome) * 100
                  )}%`,
                }}
                className="bg-amber-400 transition-all"
                title="Uang Jajan"
              />
            </div>

            {/* Legend & Breakdown Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              <div className="rounded-xl border border-ledger-200 bg-ledger-50/50 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-ledger-500" />
                  <span className="text-[10px] font-bold text-ledger-800">Tabungan Goal</span>
                </div>
                <p className="mt-1 font-mono font-bold text-ledger-700">
                  {formatRupiah(activeBreakdown.targetSavingsMonthly)}
                </p>
                <p className="text-[10px] text-ink-faint">
                  {Math.round((activeBreakdown.targetSavingsMonthly / activeBreakdown.monthlyIncome) * 100)}% gaji
                </p>
              </div>

              <div className="rounded-xl border border-paper-line bg-paper/60 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <span className="text-[10px] font-bold text-ink-soft">Kebutuhan Pokok</span>
                </div>
                <p className="mt-1 font-mono font-bold text-ink">
                  {formatRupiah(activeBreakdown.livingNeeds)}
                </p>
                <p className="text-[10px] text-ink-faint">
                  {Math.round((activeBreakdown.livingNeeds / activeBreakdown.monthlyIncome) * 100)}% gaji
                </p>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                  <span className="text-[10px] font-bold text-indigo-900">Dana Darurat</span>
                </div>
                <p className="mt-1 font-mono font-bold text-indigo-700">
                  {formatRupiah(activeBreakdown.emergencyBuffer)}
                </p>
                <p className="text-[10px] text-ink-faint">
                  {Math.round((activeBreakdown.emergencyBuffer / activeBreakdown.monthlyIncome) * 100)}% gaji
                </p>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-bold text-amber-900">Uang Jajan</span>
                </div>
                <p className="mt-1 font-mono font-bold text-amber-800">
                  {formatRupiah(activeBreakdown.jajanMonthly)}
                </p>
                <p className="text-[10px] text-ink-faint">
                  {Math.round((activeBreakdown.jajanMonthly / activeBreakdown.monthlyIncome) * 100)}% gaji
                </p>
              </div>
            </div>
          </div>

          {/* PILIHAN SKENARIO TABUNGAN */}
          <div className="rounded-2xl border border-paper-line bg-paper-card p-5 shadow-2xs space-y-3">
            <div>
              <h3 className="text-sm font-bold text-ink">⏳ Pilih Skenario Kecepatan Tabungan</h3>
              <p className="text-xs text-ink-faint">
                Klik salah satu skenario untuk menyesuaikan kecepatan dan sisa uang jajan harianmu:
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {activeBreakdown.scenarios.map((sc, idx) => {
                const isSelected = activeBreakdown.monthsToReach === sc.months;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyScenario(sc)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      isSelected
                        ? "border-ledger-500 bg-ledger-50/70 ring-2 ring-ledger-400 shadow-xs"
                        : "border-paper-line bg-white hover:border-ledger-300 hover:bg-paper/30"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-ink">{sc.badge}</span>
                      <span className="text-[11px] font-bold text-ledger-700">{sc.months} Bulan</span>
                    </div>

                    <div className="mt-2 space-y-1 text-xs">
                      <div>
                        <span className="text-[10px] text-ink-faint block">Tabung / Bulan:</span>
                        <span className="font-mono font-bold text-ledger-800">
                          {formatRupiah(sc.monthlySavings)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-ink-faint block">Batas Jajan / Hari:</span>
                        <span className="font-mono font-bold text-amber-800">
                          {formatRupiah(sc.dailyJajan)}
                        </span>
                      </div>
                    </div>

                    <p className="mt-2 text-[10px] leading-tight text-ink-faint">{sc.description}</p>

                    <div className="mt-2 text-right">
                      <span
                        className={`text-[10px] font-bold ${
                          isSelected ? "text-ledger-700" : "text-ink-faint"
                        }`}
                      >
                        {isSelected ? "✓ Sedang Dipilih" : "Pilih Skenario →"}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI PLAN CARD (READY TO APPLY TO GOALS & BUDGET LIMIT) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-ink-faint">
                🎯 Integrasi Langsung ke Aplikasi
              </span>
              <button
                type="button"
                onClick={() => setShowMarkdown(!showMarkdown)}
                className="text-xs text-ledger-600 hover:underline"
              >
                {showMarkdown ? "Sembunyikan Rincian Teks" : "Lihat Rincian Teks Lengkap"}
              </button>
            </div>

            {/* Komponen Kartu yang siap diterapakan */}
            <AiPlanCard plan={activePlan} />
          </div>

          {/* Optional Markdown View */}
          {showMarkdown && (
            <div className="rounded-2xl border border-paper-line bg-paper/60 p-4 text-xs text-ink-soft space-y-2">
              <div
                className="prose-sm leading-relaxed"
                /* eslint-disable-next-line react/no-danger */
                dangerouslySetInnerHTML={{
                  __html: renderMarkdown(stripPlanBlockFromText(planResult.planMarkdown)),
                }}
              />
            </div>
          )}
        </section>
      )}
    </Layout>
  );
}
