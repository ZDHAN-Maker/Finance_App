import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

const REMEMBER_SESSION_KEY = "dcash-remember-session";
let rememberSession =
  typeof window === "undefined" || window.sessionStorage.getItem(REMEMBER_SESSION_KEY) !== "false";

export function setRememberSession(remember: boolean) {
  rememberSession = remember;
  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(REMEMBER_SESSION_KEY, String(remember));
  }
}

const authStorage = {
  async getItem(key: string) {
    if (typeof window === "undefined") return null;
    const preferred = rememberSession ? window.localStorage : window.sessionStorage;
    const fallback = rememberSession ? window.sessionStorage : window.localStorage;
    return preferred.getItem(key) ?? fallback.getItem(key);
  },
  async setItem(key: string, value: string) {
    if (typeof window === "undefined") return;
    const preferred = rememberSession ? window.localStorage : window.sessionStorage;
    const fallback = rememberSession ? window.sessionStorage : window.localStorage;
    fallback.removeItem(key);
    preferred.setItem(key, value);
  },
  async removeItem(key: string) {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
  },
};

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY belum diset. Salin .env.example ke .env dan isi kredensial Supabase kamu."
  );
}

// Fallback ke URL placeholder yang valid secara format supaya createClient()
// tidak crash total (blank white screen) saat env variable belum diisi —
// UI tetap tampil dan menampilkan pesan konfigurasi lewat `isSupabaseConfigured`.
export const supabase = createClient(url || "https://placeholder.supabase.co", anonKey || "placeholder-anon-key", {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    storage: authStorage,
  },
});
