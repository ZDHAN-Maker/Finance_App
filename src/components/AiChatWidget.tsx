import { useEffect, useRef, useState } from "react";
import { sendChatMessage, type ChatMessage } from "../services/geminiService";
import { IconSparkle, IconX, IconSend } from "./Icons";
import { useLocation } from "react-router-dom";
import { parseAiPlanFromText, stripPlanBlockFromText } from "../utils/aiPlanManager";
import { AiPlanCard } from "./AiPlanCard";

// ---------------------------------------------------------------------------
// Gemini API limit info (Free tier)
// ---------------------------------------------------------------------------
const API_LIMIT_INFO = {
  rpm: 15, // Requests per minute
  rpd: 1500, // Requests per day (approximate free tier)
  resetDesc: "Reset setiap menit (RPM) & tengah malam WIB (harian)",
  note: "Free tier · Gemini 3.8 Flash",
};

// Quick suggestion chips
const SUGGESTIONS = [
  {
    emoji: "💰",
    label: "Rancangan nabung HP",
    text: "Buatkan rancangan tabungan beli HP Rp 5jt, gaji Rp 4jt, pengeluaran Rp 2,5jt",
  },
  {
    emoji: "🛡️",
    label: "Dana darurat",
    text: "Berapa ideal dana darurat yang harus saya punya jika gaji 4 juta?",
  },
  {
    emoji: "📈",
    label: "Reksa dana vs deposito",
    text: "Apa perbedaan reksa dana dan deposito, mana yang cocok untuk target jangka pendek?",
  },
  {
    emoji: "✂️",
    label: "Tips hemat",
    text: "Tips praktis hemat pengeluaran bulanan buat karyawan muda",
  },
];

// Inline markdown → HTML renderer
function renderMd(text: string): string {
  return text
    // Bold
    .replace(/\*\*(.+?)\*\*/gs, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/gs, "<em>$1</em>")
    // Inline code
    .replace(/`(.+?)`/g, "<code class='rounded bg-black/10 px-1 font-mono text-[11px]'>$1</code>")
    // Headers (h1, h2, h3)
    .replace(/^###\s+(.+)$/gm, "<div class='font-bold text-ink text-sm mt-3 mb-1'>$1</div>")
    .replace(/^##\s+(.+)$/gm, "<div class='font-bold text-ink text-base mt-3 mb-1'>$1</div>")
    .replace(/^#\s+(.+)$/gm, "<div class='font-bold text-ink text-lg mt-3.5 mb-1'>$1</div>")
    // Numbered lists e.g. "1. " or "2. "
    .replace(
      /^(\d+)\.\s+(.+)$/gm,
      "<div class='flex gap-1.5 pl-1 my-1 leading-snug'><span class='font-semibold text-ledger-600 shrink-0'>$1.</span><span>$2</span></div>"
    )
    // Bullet lists e.g. "- " or "* "
    .replace(
      /^[-*]\s+(.+)$/gm,
      "<div class='flex gap-1.5 pl-1 my-1 leading-snug'><span class='text-ledger-500 shrink-0'>•</span><span>$1</span></div>"
    )
    // Double newlines into paragraph spacer
    .replace(/\n\n+/g, "<div class='h-2'></div>")
    // Single newlines
    .replace(/\n/g, "<br />");
}

// ---------------------------------------------------------------------------
export function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showLimitInfo, setShowLimitInfo] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const location = useLocation();

  // Hide on AI Planner page (it has its own dedicated UI)
  const hideOnRoute = location.pathname === "/ai-planner";

  // Auto-scroll to newest message
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [messages, open, loading]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [open]);

  // Auto-resize input height smoothly when user types multi-line prompts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      const scrollH = inputRef.current.scrollHeight;
      inputRef.current.style.height = `${Math.min(Math.max(scrollH, 38), 120)}px`;
    }
  }, [input]);

  async function handleSend(text?: string) {
    const message = (text ?? input).trim();
    if (!message || loading) return;

    setInput("");
    setError(null);
    setShowSuggestions(false);
    setShowLimitInfo(false);

    // Reset textarea height to default
    if (inputRef.current) {
      inputRef.current.style.height = "38px";
    }

    const userMsg: ChatMessage = { role: "user", text: message };
    const currentMessages = messages;
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const reply = await sendChatMessage(currentMessages, message);
      setMessages((prev) => [...prev, { role: "model", text: reply }]);
    } catch (err) {
      const msg = (err as Error).message ?? "Terjadi kesalahan.";
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota");
      setError(
        isRateLimit
          ? `⏳ Limit API tercapai. Coba lagi setelah 1 menit (RPM: ${API_LIMIT_INFO.rpm}/menit).`
          : msg
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  function handleClear() {
    setMessages([]);
    setError(null);
    setShowSuggestions(true);
    setInput("");
    setShowLimitInfo(false);
  }

  if (hideOnRoute) return null;

  return (
    <>
      {/* ── Chat panel — anchored above the trigger button ── */}
      {open && (
        <div
          className={[
            // Base positioning — sits above the AI FAB button
            "fixed z-40",
            "bottom-[calc(4rem+48px+16px+env(safe-area-inset-bottom))]",
            "right-4",
            "md:bottom-[calc(48px+24px+24px)]",
            "md:right-6",
            // Responsive width
            "w-[min(calc(100vw-2rem),420px)]",
            "md:w-[440px]",
            // Appearance
            "flex flex-col overflow-hidden rounded-2xl",
            "border border-paper-line bg-paper-card shadow-2xl",
            // Height
            "max-h-[min(560px,calc(100dvh-10rem))]",
          ].join(" ")}
        >
          {/* ── Header ── */}
          <div className="flex shrink-0 items-center justify-between gap-2 bg-ledger-500 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20">
                <IconSparkle width={14} height={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight text-white">AI Keuangan</p>
                <button
                  type="button"
                  onClick={() => setShowLimitInfo((v) => !v)}
                  className="flex items-center gap-1 text-[10px] text-ledger-200 hover:text-white"
                >
                  <span>{API_LIMIT_INFO.note}</span>
                  <span className="rounded-full bg-white/15 px-1 text-[9px]">info limit</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white/70 hover:bg-white/20"
                >
                  Bersihkan
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1 text-white/80 hover:bg-white/20"
                aria-label="Tutup chat"
              >
                <IconX width={15} height={15} />
              </button>
            </div>
          </div>

          {/* ── API limit info banner (collapsible) ── */}
          {showLimitInfo && (
            <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-800">
              <p className="font-semibold">ℹ️ Info Limit Gemini API (Free Tier)</p>
              <div className="mt-1.5 space-y-0.5 text-amber-700">
                <p>
                  • Maks. <strong>{API_LIMIT_INFO.rpm} request/menit</strong> (RPM)
                </p>
                <p>
                  • Maks. <strong>~{API_LIMIT_INFO.rpd} request/hari</strong> (RPD)
                </p>
                <p>• ⏱ {API_LIMIT_INFO.resetDesc}</p>
                <p className="mt-1 text-[10px] text-amber-600">
                  Cek limit aktual kamu di{" "}
                  <a
                    href="https://aistudio.google.com/rate-limit"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline hover:text-amber-800"
                  >
                    aistudio.google.com/rate-limit
                  </a>
                </p>
              </div>
            </div>
          )}

          {/* ── Messages area ── */}
          <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-paper-line">
            {/* Welcome */}
            {messages.length === 0 && (
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ledger-100">
                  <IconSparkle width={12} height={12} className="text-ledger-600" />
                </div>
                <div className="rounded-2xl rounded-tl-sm bg-ledger-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-soft">
                  Halo! Saya AI asisten keuangan kamu 👋
                  <br />
                  Tuliskan kondisi keuangan atau target tabunganmu, saya akan buatkan rancangan detailnya!
                </div>
              </div>
            )}

            {/* Conversation */}
            {messages.map((m, i) => {
              const plan = m.role === "model" ? parseAiPlanFromText(m.text) : null;
              const displayText = m.role === "model" ? stripPlanBlockFromText(m.text) : m.text;

              return (
                <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  {m.role === "model" && (
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ledger-100">
                      <IconSparkle width={12} height={12} className="text-ledger-600" />
                    </div>
                  )}
                  <div className="max-w-[88%] space-y-2">
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "rounded-tr-sm bg-ledger-500 text-white shadow-sm"
                          : "rounded-tl-sm border border-paper-line/80 bg-ledger-50/70 text-ink shadow-sm"
                      }`}
                      /* eslint-disable-next-line react/no-danger */
                      dangerouslySetInnerHTML={{ __html: renderMd(displayText) }}
                    />
                    {plan && <AiPlanCard plan={plan} />}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex gap-2">
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ledger-100">
                  <IconSparkle width={12} height={12} className="text-ledger-600" />
                </div>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-ledger-50 px-4 py-3 border border-paper-line/70">
                  <span
                    className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ledger-500"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ledger-500"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-ledger-500"
                    style={{ animationDelay: "300ms" }}
                  />
                  <span className="ml-1 text-xs text-ink-faint">Gemini sedang merancang...</span>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="rounded-xl border border-rust-200 bg-rust-50 px-3.5 py-2.5 text-xs text-rust-600">
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* ── Suggestion chips ── */}
          {showSuggestions && messages.length === 0 && (
            <div className="shrink-0 flex flex-wrap gap-1.5 border-t border-paper-line bg-paper/50 px-3 py-2">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => void handleSend(s.text)}
                  className="rounded-full border border-ledger-200 bg-white px-2.5 py-1 text-[11px] font-medium text-ledger-700 shadow-2xs hover:bg-ledger-50 transition-colors"
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          )}

          {/* ── Input bar (Clean modern auto-expanding input) ── */}
          <div className="shrink-0 border-t border-paper-line bg-white p-2.5">
            <div className="relative flex items-end gap-1.5 rounded-2xl border border-paper-line bg-paper/60 px-2 py-1.5 transition-all focus-within:border-ledger-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-ledger-500/15">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                placeholder="Ketik kondisi keuangan atau targetmu…"
                className="max-h-28 min-h-[38px] w-full resize-none bg-transparent px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-50 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-ink-faint/20"
                style={{ lineHeight: "1.45" }}
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={!input.trim() || loading}
                className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-ledger-500 text-white shadow-xs transition-all hover:bg-ledger-600 active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                aria-label="Kirim"
              >
                <IconSend width={14} height={14} />
              </button>
            </div>
            <div className="mt-1 flex items-center justify-between px-1 text-[10px] text-ink-faint">
              <span>Shift+Enter untuk baris baru</span>
              <span>Gemini 3.8 Flash</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating trigger button ── */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Tutup AI chat" : "Buka AI chat"}
        className={[
          "fixed z-50",
          "bottom-[calc(4rem+env(safe-area-inset-bottom)+8px)]",
          "right-4",
          "md:bottom-6",
          "md:right-6",
          "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-all duration-200",
          open
            ? "bg-ink/90 text-white hover:bg-ink"
            : "bg-ledger-500 text-white hover:bg-ledger-600",
        ].join(" ")}
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          {open ? <IconX width={18} height={18} /> : <IconSparkle width={18} height={18} />}
        </span>
      </button>
    </>
  );
}
