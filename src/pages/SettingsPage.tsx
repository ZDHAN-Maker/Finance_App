import { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useAuth } from "../hooks/useAuth";
import { api } from "../services/api";
import type { AppUserProfile } from "../types";
import { IconLogout, IconSend } from "../components/Icons";

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
