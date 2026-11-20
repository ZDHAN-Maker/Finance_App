import { supabase } from "./supabaseClient";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  // Di native Android (Capacitor), host adalah capacitor://localhost atau https://localhost
  // sehingga /api perlu diarahkan ke URL live backend jika VITE_API_URL diisi atau fallback ke Vercel API.
  const isCapacitor =
    typeof window !== "undefined" &&
    (window.location.protocol === "capacitor:" ||
      window.location.origin.includes("localhost") &&
      !(window.location.port === "5173" || window.location.port === "3000"));

  const defaultApi = "https://finance-bv1flxygd-dhandans-projects.vercel.app";
  const configuredApi = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "");
  const baseUrl = configuredApi || (isCapacitor ? defaultApi : "");

  const res = await fetch(`${baseUrl}/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(body?.message ?? `Permintaan gagal (${res.status})`, res.status);
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    apiFetch<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
