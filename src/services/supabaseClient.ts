import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

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
  },
});
