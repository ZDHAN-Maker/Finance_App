import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { AppUserProfile } from "../types";
import { IconLogout, IconSend } from "../components/Icons";
import {
  getGeminiApiKey,
  setCustomGeminiApiKey,
  hasGeminiApiKey,
} from "../services/geminiService";
import { sendDeviceNotification } from "../utils/notificationService";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

interface LinkCodeResult {
  code: string;
  expires_at: string;
  bot_username: string | null;
  instructions: string;
}

export function SettingsPage() {
  const { session, signOut } = useAuth();
  const [profile, setProfile] = useState<AppUserProfile | null>(null);
  const [linkResult, setLinkResult] = useState<LinkCodeResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [installPromptEvent, setInstallPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installReady, setInstallReady] = useState(false);
  const [apiKeyActive, setApiKeyActive] = useState(() => hasGeminiApiKey());
  const [apiKeyInput, setApiKeyInput] = useState(() => getGeminiApiKey() ?? "");
  const [geminiSavedMsg, setGeminiSavedMsg] = useState<string | null>(null);

  async function loadProfile() {
    setLoading(true);
    try {
      const res = await api.get<{ data: AppUserProfile }>("/auth/me");
      setProfile(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();

    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      setInstallReady(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  async function handleGenerateCode() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ data: LinkCodeResult }>("/auth/telegram-link");
      setLinkResult(res.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleUnlink() {
    setBusy(true);
    setError(null);
    try {
      await api.delete("/auth/telegram-link");
      setLinkResult(null);
      await loadProfile();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function handleEnableNotifications() {
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      return;
    }

    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    setError(permission === "granted" ? null : "Notifikasi dibatalkan. Anda tetap bisa pakai reminder di browser.");
  }

  async function handleInstallApp() {
    if (!installPromptEvent) return;

    await installPromptEvent.prompt();
    setInstallReady(false);
    setInstallPromptEvent(null);
  }

  return (
    <Layout>
      <h1 className="mb-5 font-display text-2xl font-semibold text-ink">Pengaturan</h1>

      <section className="mb-4 rounded-card border border-paper-line bg-paper-card p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Akun</p>
        <p className="mt-2 font-medium text-ink">{profile?.name ?? "—"}</p>
        <p className="text-sm text-ink-faint">{session?.user.email}</p>
      </section>

      <section className="mb-4 rounded-card border border-paper-line bg-paper-card p-5">
        <div className="mb-3 flex items-center gap-2">
          <IconSend width={18} height={18} className="text-ledger-500" />
          <p className="font-display text-base font-semibold text-ink">Telegram</p>
        </div>

        {loading ? (
          <p className="text-sm text-ink-faint">Memuat status...</p>
        ) : profile?.telegram_connected ? (
          <div>
            <p className="mb-3 text-sm text-ledger-600">✅ Akun Telegram sudah terhubung.</p>
            <button
              onClick={handleUnlink}
              disabled={busy}
              className="rounded-lg border border-paper-line px-3 py-2 text-sm font-medium text-rust-500 hover:bg-rust-50 disabled:opacity-60"
            >
              Putuskan koneksi
            </button>
          </div>
        ) : linkResult ? (
          <div className="space-y-2">
            <p className="text-sm text-ink-soft">
              Buka chat dengan bot Telegram{linkResult.bot_username ? ` @${linkResult.bot_username}` : ""} lalu kirim:
            </p>
            <p className="rounded-lg bg-paper px-3 py-2 font-mono text-base font-semibold tracking-widest text-ledger-600">
              /link {linkResult.code}
            </p>
            <p className="text-xs text-ink-faint">
              Kode berlaku sampai {new Date(linkResult.expires_at).toLocaleTimeString("id-ID")}.
            </p>
          </div>
        ) : (
          <div>
            <p className="mb-3 text-sm text-ink-faint">
              Hubungkan akun Telegram supaya transaksi yang kamu kirim lewat bot masuk ke dashboard yang sama.
            </p>
            <button
              onClick={handleGenerateCode}
              disabled={busy}
              className="rounded-lg bg-ledger-500 px-3 py-2 text-sm font-semibold text-white hover:bg-ledger-600 disabled:opacity-60"
            >
              {busy ? "Membuat kode..." : "Hubungkan Telegram"}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-rust-500">{error}</p>}
      </section>

      {/* ── Gemini AI Configuration ── */}
      <section className="mb-4 rounded-card border border-paper-line bg-paper-card p-5">
        <div className="flex items-center justify-between">
          <p className="font-display text-base font-semibold text-ink">Gemini AI Keuangan</p>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              apiKeyActive
                ? "bg-emerald-100 text-emerald-800"
                : "bg-amber-100 text-amber-800"
            }`}
          >
            {apiKeyActive ? "✓ Terhubung" : "Belum Diset"}
          </span>
        </div>

        <p className="mt-2 text-sm text-ink-faint">
          Kunci API untuk asisten chat finansial dan auto-planner tabungan cerdas.
        </p>

        <div className="mt-3 space-y-2">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="Tempelkan Gemini API Key kamu"
            className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-sm font-mono text-ink placeholder:text-ink-faint focus:border-ledger-500 focus:bg-white focus:outline-none"
          />

          <div className="flex items-center justify-between pt-1">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-ledger-600 hover:underline"
            >
              Dapatkan API Key gratis ↗
            </a>

            <div className="flex gap-2">
              {apiKeyActive && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomGeminiApiKey(null);
                    setApiKeyInput("");
                    setApiKeyActive(hasGeminiApiKey());
                    setGeminiSavedMsg("API key dihapus.");
                    setTimeout(() => setGeminiSavedMsg(null), 3000);
                  }}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-rust-600 hover:bg-rust-50"
                >
                  Reset
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const val = apiKeyInput.trim();
                  if (val) {
                    setCustomGeminiApiKey(val);
                    setApiKeyActive(true);
                    setGeminiSavedMsg("API Key berhasil disimpan!");
                    setTimeout(() => setGeminiSavedMsg(null), 3000);
                  }
                }}
                disabled={!apiKeyInput.trim()}
                className="rounded-lg bg-ledger-500 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-ledger-600 disabled:opacity-40"
              >
                Simpan
              </button>
            </div>
          </div>
          {geminiSavedMsg && (
            <p className="mt-1 text-xs text-emerald-600 font-medium">{geminiSavedMsg}</p>
          )}
        </div>
      </section>

      <section className="mb-4 rounded-card border border-paper-line bg-paper-card p-5">
        <p className="font-display text-base font-semibold text-ink">Notifikasi & install</p>

        <div className="mt-3 space-y-3">
          <button
            type="button"
            onClick={handleEnableNotifications}
            className="w-full rounded-lg bg-ledger-500 px-3 py-2.5 text-sm font-semibold text-white hover:bg-ledger-600"
          >
            {notificationPermission === "granted"
              ? "Notifikasi aktif"
              : notificationPermission === "denied"
                ? "Notifikasi diblokir"
                : "Izinkan notifikasi"}
          </button>

          <button
            type="button"
            onClick={async () => {
              if (notificationPermission !== "granted") {
                const res = await Notification.requestPermission();
                setNotificationPermission(res);
                if (res !== "granted") return;
              }
              await sendDeviceNotification("💰 D'Cash - Batasan Hari Ini", {
                body: "Notifikasi HP aktif! Kamu akan menerima pengingat batas belanja & jatah jajan harian.",
              });
            }}
            className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2 text-xs font-semibold text-ink hover:bg-paper-line"
          >
            🔔 Tes Notifikasi Batasan ke HP
          </button>

          {installReady && installPromptEvent && (
            <button
              type="button"
              onClick={handleInstallApp}
              className="w-full rounded-lg border border-paper-line bg-paper px-3 py-2.5 text-sm font-semibold text-ink hover:bg-paper-line"
            >
              Install ke HP
            </button>
          )}
        </div>
      </section>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-paper-line bg-paper-card py-2.5 text-sm font-medium text-ink-soft hover:bg-paper-line/40"
      >
        <IconLogout width={16} height={16} />
        Keluar
      </button>
    </Layout>
  );
}
