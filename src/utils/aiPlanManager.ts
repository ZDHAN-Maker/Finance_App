import type { SavingsGoal } from "./savingsGoals";
import { api } from "../services/api";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";

export interface AiBudgetPlan {
  id: string;
  createdAt: string;
  appliedAt?: string;
  status: "active" | "completed" | "archived";
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string; // YYYY-MM-DD
  monthlyBudgetLimit: number; // Menyetel batas pengeluaran bulanan (kas-budget-limit)
  monthlyIncome: number;
  recurringAmount: number; // Setoran bulanan otomatis
  recurringDay: number; // Tanggal auto-save bulanan (1-31)
  reminderDays: number;
  summary: string;
}

const GOALS_STORAGE_KEY = "kas-savings-goals-v1";
const BUDGET_LIMIT_KEY = "kas-budget-limit";
const PLANS_HISTORY_KEY = "kas-ai-applied-plans";

/**
 * Mengekstrak blok data JSON rancangan anggaran yang dihasilkan oleh Gemini.
 */
export function parseAiPlanFromText(text: string): AiBudgetPlan | null {
  if (!text) return null;

  // Mencari blok ```json:financial-plan atau ```json yang memuat goalName
  const match =
    text.match(/```json(?::financial-plan)?\s*([\s\S]*?)```/i) ||
    text.match(/```\s*(\{[\s\S]*?"goalName"[\s\S]*?\})\s*```/i);

  if (!match) return null;

  try {
    const raw = JSON.parse(match[1].trim()) as Record<string, unknown>;
    if (!raw.goalName || raw.targetAmount === undefined) return null;

    const targetAmount = Number(raw.targetAmount);
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) return null;

    const currentAmount = Number(raw.currentAmount ?? 0);
    const monthlyIncome = Number(raw.monthlyIncome ?? 0);
    const monthlyBudgetLimit = Number(raw.monthlyBudgetLimit ?? 0);
    const recurringAmount = Number(raw.recurringAmount ?? 0);
    const recurringDay = Math.min(Math.max(Number(raw.recurringDay ?? 25), 1), 31);
    const reminderDays = Number(raw.reminderDays ?? 7);

    // Validasi format tanggal YYYY-MM-DD
    let deadline = String(raw.deadline ?? "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
      const nextDate = new Date();
      nextDate.setFullYear(nextDate.getFullYear() + 2);
      deadline = nextDate.toISOString().slice(0, 10);
    }

    return {
      id: String(raw.id ?? `plan-${Date.now()}`),
      createdAt: new Date().toISOString(),
      status: "active",
      goalName: String(raw.goalName).trim(),
      targetAmount,
      currentAmount: Math.max(currentAmount, 0),
      deadline,
      monthlyBudgetLimit: Math.max(monthlyBudgetLimit, 0),
      monthlyIncome: Math.max(monthlyIncome, 0),
      recurringAmount: Math.max(recurringAmount, 0),
      recurringDay,
      reminderDays,
      summary: String(raw.summary ?? "").trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Menghapus blok JSON financial-plan dari teks pesan chat agar tidak mengotori tampilan chat markdown.
 */
export function stripPlanBlockFromText(text: string): string {
  if (!text) return "";
  return text.replace(/```json(?::financial-plan)?\s*[\s\S]*?```/gi, "").trim();
}

/**
 * Menerapkan seluruh parameter rancangan AI langsung ke Dashboard:
 * 1. Menambahkan target tabungan baru ke sistem (lengkap dengan setoran awal & auto-save).
 * 2. Mengatur batas pengeluaran bulanan (kas-budget-limit) -> otomatis menyetel Panduan Belanja Hari Ini.
 * 3. Menyimpan riwayat rancangan AI agar bisa ditinjau kembali atau membuat target baru saat target selesai.
 * 4. Memancarkan event 'kas-data-updated' agar seluruh halaman bereaksi seketika.
 */
export function applyAiPlan(plan: AiBudgetPlan): { success: boolean; goalId: string } {
  const goalId = crypto.randomUUID();

  // 1. Buat data SavingsGoal untuk dashboard
  const nextGoal: SavingsGoal = {
    id: goalId,
    name: plan.goalName,
    targetAmount: plan.targetAmount,
    currentAmount: plan.currentAmount,
    deadline: plan.deadline,
    reminderDays: plan.reminderDays || 7,
    createdAt: new Date().toISOString(),
    recurringAmount: plan.recurringAmount,
    recurringDay: plan.recurringDay,
    history:
      plan.currentAmount > 0
        ? [
            {
              amount: plan.currentAmount,
              date: new Date().toISOString().slice(0, 10),
              note: "Setoran awal (Rancangan AI)",
            },
          ]
        : [],
  };

  // Simpan ke storage target tabungan
  let existingGoals: SavingsGoal[] = [];
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY);
    if (raw) existingGoals = JSON.parse(raw);
    if (!Array.isArray(existingGoals)) existingGoals = [];
  } catch {
    existingGoals = [];
  }

  // Cek apakah sudah ada target dengan nama yang sama persis
  const filtered = existingGoals.filter((g) => g.name.toLowerCase() !== nextGoal.name.toLowerCase());
  const updatedGoals = [nextGoal, ...filtered];
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updatedGoals));

  // 2. Setel batas anggaran bulanan (mengatur panduan belanja harian & status anggaran)
  if (plan.monthlyBudgetLimit > 0) {
    localStorage.setItem(BUDGET_LIMIT_KEY, String(plan.monthlyBudgetLimit));
  }

  // 3. Simpan ke riwayat rancangan AI
  const historyItem: AiBudgetPlan = {
    ...plan,
    id: goalId,
    appliedAt: new Date().toISOString(),
    status: "active",
  };

  let plansHistory: AiBudgetPlan[] = [];
  try {
    const raw = localStorage.getItem(PLANS_HISTORY_KEY);
    if (raw) plansHistory = JSON.parse(raw);
    if (!Array.isArray(plansHistory)) plansHistory = [];
  } catch {
    plansHistory = [];
  }

  const updatedHistory = [historyItem, ...plansHistory];
  localStorage.setItem(PLANS_HISTORY_KEY, JSON.stringify(updatedHistory));

  // 4. Pancarkan event agar Dashboard dan useSavingsGoals langsung re-render secara instan
  window.dispatchEvent(new CustomEvent("kas-data-updated", { detail: historyItem }));

  // 5. Sinkronisasi ke server Supabase jika user sedang login
  if (typeof window !== "undefined" && isSupabaseConfigured) {
    void (async () => {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData?.session) return;

        const res = await api.post<{ data: { id: string } }>("/savings-goals", {
          name: nextGoal.name,
          target_amount: nextGoal.targetAmount,
          current_amount: nextGoal.currentAmount,
          deadline: nextGoal.deadline,
          reminder_days: nextGoal.reminderDays,
          recurring_amount: nextGoal.recurringAmount,
          recurring_day: nextGoal.recurringDay,
          history: nextGoal.history,
        });

        if (res?.data?.id && res.data.id !== goalId) {
          const serverId = res.data.id;
          const raw = localStorage.getItem(GOALS_STORAGE_KEY);
          if (raw) {
            const list = JSON.parse(raw) as SavingsGoal[];
            const updated = list.map((g) => (g.id === goalId ? { ...g, id: serverId } : g));
            localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(updated));
          }
          const rawHistory = localStorage.getItem(PLANS_HISTORY_KEY);
          if (rawHistory) {
            const hList = JSON.parse(rawHistory) as AiBudgetPlan[];
            const updatedH = hList.map((h) => (h.id === goalId ? { ...h, id: serverId } : h));
            localStorage.setItem(PLANS_HISTORY_KEY, JSON.stringify(updatedH));
          }
        }
      } catch (err) {
        // Fallback lokal tetap aman dan aktif
        console.warn("Sinkronisasi cloud target AI ditangguhkan (tersimpan di lokal):", err);
      }
    })();
  }

  return { success: true, goalId };
}

/**
 * Mengambil seluruh daftar riwayat rancangan AI yang pernah disetujui / diterapkan.
 */
export function getAiPlanHistory(): AiBudgetPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_HISTORY_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as AiBudgetPlan[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/**
 * Memperbarui status rancangan AI (misal: saat target sudah tercapai / selesai).
 */
export function updateAiPlanStatus(id: string, status: AiBudgetPlan["status"]) {
  const history = getAiPlanHistory().map((p) => (p.id === id ? { ...p, status } : p));
  localStorage.setItem(PLANS_HISTORY_KEY, JSON.stringify(history));
  window.dispatchEvent(new CustomEvent("kas-data-updated"));
}

