import { useEffect, useState } from "react";
import { api } from "../services/api";
import { isSupabaseConfigured, supabase } from "../services/supabaseClient";
import { calculateGoalProgress, shouldApplyRecurringDeposit, type SavingsGoal } from "../utils/savingsGoals";

const STORAGE_KEY = "kas-savings-goals-v1";
const REMINDER_PREFIX = "kas-goal-reminder-";

function getReminderKey(goalId: string) {
  return `${REMINDER_PREFIX}${goalId}`;
}

function getReminderDate(goal: SavingsGoal) {
  const target = new Date(`${goal.deadline}T00:00:00`);
  const reminder = new Date(target);
  reminder.setDate(target.getDate() - goal.reminderDays);
  return reminder;
}

function normalizeGoal(goal: unknown): SavingsGoal {
  const raw = goal as { [key: string]: unknown };
  const history = Array.isArray(raw.history)
    ? raw.history.map((item) => {
        const entry = item as { [key: string]: unknown };
        return {
          amount: Number(entry.amount ?? 0),
          date: String(entry.date ?? new Date().toISOString().slice(0, 10)),
          ...(typeof entry.note === "string" ? { note: entry.note } : {}),
        };
      })
    : [];

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    name: String(raw.name ?? ""),
    targetAmount: Number(raw.targetAmount ?? raw.target_amount ?? 0),
    currentAmount: Number(raw.currentAmount ?? raw.current_amount ?? 0),
    deadline: String(raw.deadline ?? ""),
    reminderDays: Number(raw.reminderDays ?? raw.reminder_days ?? 0),
    createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
    recurringAmount: Number(raw.recurringAmount ?? raw.recurring_amount ?? 0),
    recurringDay: Number(raw.recurringDay ?? raw.recurring_day ?? 0),
    history: history as SavingsGoal["history"],
  };
}

function serializeGoal(goal: Partial<SavingsGoal>) {
  return {
    name: goal.name,
    target_amount: Number(goal.targetAmount ?? 0),
    current_amount: Number(goal.currentAmount ?? 0),
    deadline: goal.deadline,
    reminder_days: Number(goal.reminderDays ?? 0),
    recurring_amount: Number(goal.recurringAmount ?? 0),
    recurring_day: Number(goal.recurringDay ?? 0),
    history: Array.isArray(goal.history) ? goal.history : [],
  };
}

async function getActiveSession() {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function useSavingsGoals() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as SavingsGoal[];
        if (Array.isArray(parsed)) {
          setGoals(parsed.map(normalizeGoal));
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    let cancelled = false;

    async function hydrateFromServer() {
      if (!isSupabaseConfigured) return;
      try {
        const session = await getActiveSession();
        if (!session || cancelled) return;
        const { data } = await api.get<{ data: SavingsGoal[] }>("/savings-goals");
        if (!cancelled && Array.isArray(data)) {
          setGoals(data.map(normalizeGoal));
        }
      } catch {
        // Keep localStorage data as fallback when the user is not logged in or the API is unavailable.
      }
    }

    hydrateFromServer();

    if ("Notification" in window) {
      setPermission(Notification.permission);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(goals));
  }, [goals]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const today = new Date();
    const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

    goals.forEach((goal) => {
      if (!shouldApplyRecurringDeposit(goal, today)) return;

      const key = `kas-goal-autosave-${goal.id}-${monthKey}`;
      if (sessionStorage.getItem(key)) return;

      if (goal.recurringAmount && goal.recurringAmount > 0) {
        setGoals((prev) =>
          prev.map((item) => {
            if (item.id !== goal.id) return item;
            const nextHistory = [
              ...(item.history ?? []),
              {
                amount: goal.recurringAmount!,
                date: today.toISOString().slice(0, 10),
                note: "Auto-save bulanan",
              },
            ];

            return {
              ...item,
              currentAmount: Math.max(0, item.currentAmount + (goal.recurringAmount ?? 0)),
              history: nextHistory,
            };
          })
        );
        sessionStorage.setItem(key, "1");
      }
    });
  }, [goals]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const timer = window.setInterval(() => {
      goals.forEach((goal) => {
        const progress = calculateGoalProgress(goal);
        const reminderDate = getReminderDate(goal);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const key = getReminderKey(goal.id);
        const shouldSend =
          progress.daysLeft <= goal.reminderDays &&
          progress.daysLeft >= 0 &&
          reminderDate.getTime() <= today.getTime() &&
          !sessionStorage.getItem(key);

        if (!shouldSend) return;

        new Notification("Reminder target tabungan", {
          body: `${goal.name} akan jatuh tempo dalam ${Math.max(progress.daysLeft, 0)} hari. Sisa ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(progress.remainingAmount)}.`,
          tag: goal.id,
        });

        sessionStorage.setItem(key, "1");
      });
    }, 60000);

    return () => window.clearInterval(timer);
  }, [goals]);

  function addGoal(goal: Omit<SavingsGoal, "id" | "createdAt">) {
    const nextGoal: SavingsGoal = {
      ...goal,
      recurringAmount: goal.recurringAmount ?? 0,
      recurringDay: goal.recurringDay ?? 0,
      history: goal.history ?? [],
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };

    setGoals((prev) => [nextGoal, ...prev]);

    void (async () => {
      try {
        const session = await getActiveSession();
        if (!session) return;
        const { data } = await api.post<{ data: SavingsGoal }>("/savings-goals", serializeGoal(nextGoal));
        setGoals((prev) => [normalizeGoal(data), ...prev.filter((item) => item.id !== nextGoal.id)]);
      } catch {
        // Keep the optimistic local change when remote sync is unavailable.
      }
    })();

    return nextGoal;
  }

  function addContribution(goalId: string, amount: number) {
    const nextAmount = Number(amount);
    if (!Number.isFinite(nextAmount) || nextAmount <= 0) return;

    const updatedGoal = goals.find((goal) => goal.id === goalId);
    if (!updatedGoal) return;

    const nextHistory = [
      ...(updatedGoal.history ?? []),
      {
        amount: nextAmount,
        date: new Date().toISOString().slice(0, 10),
        note: "Setoran manual",
      },
    ];

    const mergedGoal: SavingsGoal = {
      ...updatedGoal,
      currentAmount: Math.max(0, updatedGoal.currentAmount + nextAmount),
      history: nextHistory,
    };

    setGoals((prev) => prev.map((goal) => (goal.id === goalId ? mergedGoal : goal)));

    void (async () => {
      try {
        const session = await getActiveSession();
        if (!session) return;
        const { data } = await api.put<{ data: SavingsGoal }>(`/savings-goals/${goalId}`, {
          current_amount: mergedGoal.currentAmount,
          history: mergedGoal.history,
        });
        setGoals((prev) => prev.map((goal) => (goal.id === goalId ? normalizeGoal(data) : goal)));
      } catch {
        // Keep local updates when remote sync is unavailable.
      }
    })();
  }

  function removeGoal(goalId: string) {
    setGoals((prev) => prev.filter((goal) => goal.id !== goalId));
    sessionStorage.removeItem(getReminderKey(goalId));

    void (async () => {
      try {
        const session = await getActiveSession();
        if (!session) return;
        await api.delete(`/savings-goals/${goalId}`);
      } catch {
        // Ignore remote delete errors so the UX remains resilient.
      }
    })();
  }

  function triggerManualReminder(goal: SavingsGoal) {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const progress = calculateGoalProgress(goal);
    new Notification("Target tabungan Anda", {
      body: `${goal.name}: ${progress.remainingAmount > 0 ? `sisa ${new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(progress.remainingAmount)} lagi` : "sudah tercapai"}.`,
      tag: goal.id,
    });
  }

  async function requestNotificationPermission() {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return "unsupported" as const;
    }

    const result = await Notification.requestPermission();
    setPermission(result);
    return result;
  }

  return {
    goals,
    addGoal,
    addContribution,
    removeGoal,
    permission,
    requestNotificationPermission,
    triggerManualReminder,
    getReminderDate,
  };
}
