import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cachedAdmin: SupabaseClient | null = null;

/**
 * Client dengan SUPABASE_SERVICE_ROLE_KEY — melewati Row Level Security.
 * HANYA dipakai di server (api/**), dan HANYA untuk kasus yang memang
 * tidak punya JWT user (mis. webhook Telegram). Jangan pernah kirim
 * service role key ke frontend.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (cachedAdmin) return cachedAdmin;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diset di environment variables."
    );
  }

  cachedAdmin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cachedAdmin;
}

/**
 * Client yang bertindak SEBAGAI user tertentu (memakai JWT dari header
 * Authorization request). Query lewat client ini tetap tunduk pada RLS —
 * ini cara kita membiarkan Postgres sendiri yang menegakkan "user hanya
 * bisa lihat data miliknya", bukan hanya filter manual di kode.
 */
export function getSupabaseForToken(accessToken: string): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL / SUPABASE_ANON_KEY belum diset di environment variables.");
  }

  return createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}
