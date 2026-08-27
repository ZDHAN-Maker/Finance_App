import type { VercelRequest, VercelResponse } from "@vercel/node";
import { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseForToken } from "./supabaseAdmin.js";

export interface AppUser {
  id: string;
  auth_user_id: string;
  telegram_id: number | null;
  name: string | null;
}

export interface AuthContext {
  supabase: SupabaseClient;
  appUser: AppUser;
}

function extractBearerToken(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  const token = header.slice("Bearer ".length).trim();
  return token || null;
}

/**
 * Ambil user yang sedang login dari header Authorization (JWT Supabase).
 * Mengembalikan `null` (dan sudah mengirim response 401) jika tidak valid,
 * supaya endpoint tinggal `if (!ctx) return;`.
 */
export async function requireUser(
  req: VercelRequest,
  res: VercelResponse
): Promise<AuthContext | null> {
  const token = extractBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Header Authorization Bearer <token> tidak ditemukan." });
    return null;
  }

  const supabase = getSupabaseForToken(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Unauthorized", message: "Sesi tidak valid atau kedaluwarsa." });
    return null;
  }

  const { data: appUser, error: profileError } = await supabase
    .from("users")
    .select("id, auth_user_id, telegram_id, name")
    .eq("auth_user_id", data.user.id)
    .single();

  if (profileError || !appUser) {
    res.status(404).json({
      error: "ProfileNotFound",
      message: "Profil user belum tersedia. Coba login ulang.",
    });
    return null;
  }

  return { supabase, appUser: appUser as AppUser };
}
