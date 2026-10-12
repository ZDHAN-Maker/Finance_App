import { useState, useRef, useEffect } from "react";
import { Layout } from "../components/Layout";
import { formatRupiah } from "../utils/formatCurrency";
import { generateSavingsPlan, type SavingsPlanInput } from "../services/geminiService";
import { IconSparkle } from "../components/Icons";
import { parseAiPlanFromText, stripPlanBlockFromText } from "../utils/aiPlanManager";
import { AiPlanCard } from "../components/AiPlanCard";

// Simple markdown renderer (bold, headers, lists, tables, inline code)
function renderMarkdown(text: string): string {
  return text
    // Headers
    .replace(/^### (.+)$/gm, "<h3 class=\"text-base font-semibold text-ink mt-4 mb-1\">$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 class=\"text-lg font-semibold text-ink mt-5 mb-2\">$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 class=\"text-xl font-bold text-ink mt-5 mb-2\">$1</h1>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong class=\"font-semibold text-ink\">$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, "<code class=\"rounded bg-paper px-1 py-0.5 font-mono text-xs text-ledger-700\">$1</code>")
    // Horizontal rule
    .replace(/^---$/gm, "<hr class=\"my-3 border-paper-line\" />")
    // Unordered list items
    .replace(/^[-*] (.+)$/gm, "<li class=\"ml-4 list-disc text-ink-soft\">$1</li>")
    // Numbered list items
    .replace(/^\d+\. (.+)$/gm, "<li class=\"ml-4 list-decimal text-ink-soft\">$1</li>")
    // Wrap consecutive <li> in <ul>
    .replace(/(<li[\s\S]+?<\/li>)(\n<li)/g, "$1$2")
    // Line breaks (double newline → paragraph break, single → <br>)
    .replace(/\n\n/g, "</p><p class=\"mt-2 text-sm text-ink-soft\">")
    .replace(/\n/g, "<br />");
}

const EXAMPLE_NOTES = [
  "Saya ingin beli HP baru seharga Rp 5.000.000, gaji saya Rp 4.000.000/bulan, pengeluaran rutin Rp 2.500.000.",
  "Mau liburan ke Bali budget Rp 8.000.000. Gaji Rp 6.000.000, pengeluaran Rp 3.500.000. Sudah punya tabungan Rp 1.000.000.",
  "Mau beli motor Rp 20.000.000 DP. Gaji Rp 5.000.000, pengeluaran Rp 3.000.000.",
];

export function AiPlannerPage() {
  // Form state
  const [itemName, setItemName] = useState("");
  const [targetPrice, setTargetPrice] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [monthlyExpense, setMonthlyExpense] = useState("");
  const [currentSavings, setCurrentSavings] = useState("");
  const [notes, setNotes] = useState("");

  // Result state
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  function handleReset() {
    setItemName("");
    setTargetPrice("");
    setMonthlyIncome("");
    setMonthlyExpense("");
    setCurrentSavings("");
    setNotes("");
    setResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const price = Number(targetPrice);
    const income = Number(monthlyIncome);

    if (!itemName.trim()) {
      setError("Nama tujuan tabungan wajib diisi.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Harga target harus lebih dari 0.");
      return;
    }
    if (!Number.isFinite(income) || income <= 0) {
      setError("Pemasukan per bulan harus lebih dari 0.");
      return;
    }

    const input: SavingsPlanInput = {
      itemName: itemName.trim(),
      targetPrice: price,
      monthlyIncome: income,
      monthlyExpense: monthlyExpense ? Number(monthlyExpense) : 0,
      currentSavings: currentSavings ? Number(currentSavings) : 0,
      notes: notes.trim() || undefined,
    };

    setLoading(true);
    try {
      const response = await generateSavingsPlan(input);
      setResult(response.plan);
    } catch (err) {
      setError((err as Error).message ?? "Terjadi kesalahan. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ledger-500 text-white">
          <IconSparkle width={20} height={20} />
        </div>
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">AI Planner</h1>
          <p className="text-xs text-ink-faint">Rancang tabungan kamu dengan bantuan Gemini AI</p>
        </div>
      </div>

      {/* Form */}
      <section className="rounded-card border border-paper-line bg-paper-card p-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Item name */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Apa yang ingin kamu beli / tujuan tabungan? *
            </label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Contoh: HP baru, Liburan Bali, DP Rumah"
              className="w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm focus:border-ledger-500 focus:outline-none"
            />
          </div>

          {/* Target price */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Harga / budget target (Rp) *
            </label>
            <input
              type="number"
              min={1}
              value={targetPrice}
              onChange={(e) => setTargetPrice(e.target.value)}
              placeholder="5000000"
              className="w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm focus:border-ledger-500 focus:outline-none"
            />
            {targetPrice && Number(targetPrice) > 0 && (
              <p className="mt-1 text-[11px] text-ledger-700">{formatRupiah(Number(targetPrice))}</p>
            )}
          </div>

          {/* Monthly income */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Pemasukan / gaji bersih per bulan (Rp) *
            </label>
            <input
              type="number"
              min={1}
              value={monthlyIncome}
              onChange={(e) => setMonthlyIncome(e.target.value)}
              placeholder="4000000"
              className="w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm focus:border-ledger-500 focus:outline-none"
            />
            {monthlyIncome && Number(monthlyIncome) > 0 && (
              <p className="mt-1 text-[11px] text-ledger-700">{formatRupiah(Number(monthlyIncome))}</p>
            )}
          </div>

          {/* Expense + savings row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                Pengeluaran rutin / bulan (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={monthlyExpense}
                onChange={(e) => setMonthlyExpense(e.target.value)}
                placeholder="2500000"
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm focus:border-ledger-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">
                Tabungan saat ini (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={currentSavings}
                onChange={(e) => setCurrentSavings(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm focus:border-ledger-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-soft">
              Catatan tambahan (opsional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: saya punya cicilan motor 500rb/bulan, atau saya bisa lembur untuk tambahan income..."
              className="w-full rounded-lg border border-paper-line bg-white px-3 py-2.5 text-sm focus:border-ledger-500 focus:outline-none resize-none"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rust-50 p-3 text-sm text-rust-700 space-y-2">
              <p className="font-semibold text-rust-800">⚠️ {error}</p>
              {error.includes("VITE_GEMINI_API_KEY") && (
                <div className="pt-2 border-t border-rust-200/60 flex items-center justify-between gap-2">
                  <span className="text-xs text-rust-600">
                    Kamu bisa mengatur API Key di halaman Pengaturan tanpa perlu redeploy.
                  </span>
                  <a
                    href="/settings"
                    className="shrink-0 rounded-md bg-rust-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rust-700"
                  >
                    Atur di Pengaturan ⚙️
                  </a>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ledger-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-ledger-600 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Gemini sedang berpikir...
                </>
              ) : (
                <>
                  <IconSparkle width={16} height={16} />
                  Buatkan rancangan tabungan
                </>
              )}
            </button>
            {(result || error) && (
              <button
                type="button"
                onClick={handleReset}
                className="rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-line"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </section>

      {/* Quick example chips */}
      {!result && !loading && (
        <section className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-wide text-ink-faint">Contoh cepat</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_NOTES.map((ex, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  // Parse example into fields
                  const hpMatch = ex.match(/Rp\s?([\d.,]+)/g);
                  const prices = hpMatch?.map((s) =>
                    Number(s.replace(/Rp\s?/, "").replace(/\./g, "").replace(",", "."))
                  ) ?? [];

                  if (i === 0) {
                    setItemName("HP baru");
                    setTargetPrice("5000000");
                    setMonthlyIncome("4000000");
                    setMonthlyExpense("2500000");
                    setCurrentSavings("0");
                  } else if (i === 1) {
                    setItemName("Liburan ke Bali");
                    setTargetPrice("8000000");
                    setMonthlyIncome("6000000");
                    setMonthlyExpense("3500000");
                    setCurrentSavings("1000000");
                  } else if (i === 2) {
                    setItemName("DP Motor");
                    setTargetPrice("20000000");
                    setMonthlyIncome("5000000");
                    setMonthlyExpense("3000000");
                    setCurrentSavings("0");
                  }
                  // Use dummy to prevent unused variable warning
                  void prices;
                  setNotes("");
                  setResult(null);
                  setError(null);
                }}
                className="rounded-full border border-ledger-200 bg-ledger-50 px-3 py-1.5 text-xs font-medium text-ledger-700 hover:bg-ledger-100"
              >
                {i === 0 ? "📱 HP baru" : i === 1 ? "✈️ Liburan Bali" : "🏍️ DP Motor"}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Result */}
      {result && (
        <section ref={resultRef} className="mt-5 rounded-card border border-ledger-200 bg-paper-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <IconSparkle width={16} height={16} className="text-ledger-500" />
            <p className="text-sm font-semibold text-ledger-700">Rancangan Tabungan dari Gemini AI</p>
          </div>
          {(() => {
            const plan = parseAiPlanFromText(result);
            const cleanText = stripPlanBlockFromText(result);
            return (
              <>
                <div
                  className="prose-sm text-sm text-ink-soft leading-relaxed"
                  /* eslint-disable-next-line react/no-danger */
                  dangerouslySetInnerHTML={{
                    __html: `<p class="mt-2 text-sm text-ink-soft">${renderMarkdown(cleanText)}</p>`,
                  }}
                />
                {plan && <AiPlanCard plan={plan} />}
              </>
            );
          })()}
          <div className="border-t border-paper-line pt-3">
            <p className="text-[11px] text-ink-faint">
              Hasil di atas dibuat oleh Gemini AI dan bersifat informatif. Selalu sesuaikan dengan kondisi keuangan kamu yang sebenarnya.
            </p>
          </div>
        </section>
      )}
    </Layout>
  );
}

