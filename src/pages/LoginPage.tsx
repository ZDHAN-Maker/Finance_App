import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isSupabaseConfigured } from "../services/supabaseClient";

export function LoginPage() {
  const { session, loading, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!loading && session) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);

    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password, name);

    if (result.error) {
      setError(result.error);
    } else if (mode === "register") {
      setInfo("Akun dibuat. Cek email kamu jika verifikasi diperlukan, lalu masuk.");
      setMode("login");
    }
    setSubmitting(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-ledger-500 font-display text-lg font-semibold text-white">
            K
          </div>
          <h1 className="font-display text-2xl font-semibold text-ink">Kas</h1>
          <p className="mt-1 text-sm text-ink-faint">Catat lewat Telegram, pantau lewat sini.</p>
        </div>

        <div className="rounded-card border border-paper-line bg-paper-card p-5 shadow-card">
          {!isSupabaseConfigured && (
            <p className="mb-4 rounded-lg bg-rust-50 px-3 py-2 text-xs text-rust-600">
              ⚠️ Supabase belum dikonfigurasi. Salin <code>.env.example</code> ke <code>.env</code> dan isi
              <code> VITE_SUPABASE_URL</code> / <code>VITE_SUPABASE_ANON_KEY</code>.
            </p>
          )}
          <div className="mb-5 flex rounded-lg bg-paper p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-md py-1.5 ${mode === "login" ? "bg-paper-card text-ink shadow-sm" : "text-ink-faint"}`}
            >
              Masuk
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-md py-1.5 ${mode === "register" ? "bg-paper-card text-ink shadow-sm" : "text-ink-faint"}`}
            >
              Daftar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-ink-soft">Nama</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
                  placeholder="Nama kamu"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
                placeholder="nama@email.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-soft">Kata sandi</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-paper-line bg-white px-3 py-2 text-sm focus:border-ledger-500"
                placeholder="Minimal 6 karakter"
              />
            </div>

            {error && <p className="text-sm text-rust-500">{error}</p>}
            {info && <p className="text-sm text-ledger-600">{info}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-ledger-500 py-2.5 text-sm font-semibold text-white hover:bg-ledger-600 disabled:opacity-60"
            >
              {submitting ? "Memproses..." : mode === "login" ? "Masuk" : "Buat akun"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
