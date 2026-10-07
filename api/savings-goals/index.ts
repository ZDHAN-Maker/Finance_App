import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_lib/auth.js";

function normalizeHistory(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const amount = Number(item.amount ?? 0);
      const date = typeof item.date === "string" && item.date ? item.date : new Date().toISOString().slice(0, 10);
      const note = typeof item.note === "string" ? item.note : undefined;

      return {
        amount: Number.isFinite(amount) ? amount : 0,
        date,
        ...(note ? { note } : {}),
      };
    })
    .filter((item) => item.amount >= 0);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await requireUser(req, res);
  if (!ctx) return;
  const { supabase, appUser } = ctx;

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount, current_amount, deadline, reminder_days, recurring_amount, recurring_day, history, created_at")
      .eq("user_id", appUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    res.status(200).json({
      data: (data ?? []).map((goal) => ({
        id: goal.id,
        name: goal.name,
        targetAmount: Number(goal.target_amount ?? 0),
        currentAmount: Number(goal.current_amount ?? 0),
        deadline: goal.deadline,
        reminderDays: Number(goal.reminder_days ?? 0),
        recurringAmount: Number(goal.recurring_amount ?? 0),
        recurringDay: Number(goal.recurring_day ?? 0),
        history: Array.isArray(goal.history) ? goal.history : [],
        createdAt: goal.created_at,
      })),
    });
    return;
  }

  if (req.method === "POST") {
    const body = req.body ?? {};
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const targetAmount = Number(body.target_amount ?? body.targetAmount ?? 0);
    const currentAmount = Number(body.current_amount ?? body.currentAmount ?? 0);
    const reminderDays = Number(body.reminder_days ?? body.reminderDays ?? 7);
    const recurringAmount = Number(body.recurring_amount ?? body.recurringAmount ?? 0);
    const recurringDay = Number(body.recurring_day ?? body.recurringDay ?? 0);
    const deadline = typeof body.deadline === "string" && body.deadline ? body.deadline : null;
    const history = normalizeHistory(body.history);

    if (!name) {
      res.status(400).json({ error: "BadRequest", message: "name wajib diisi." });
      return;
    }
    if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
      res.status(400).json({ error: "BadRequest", message: "target_amount harus lebih dari 0." });
      return;
    }
    if (!Number.isFinite(currentAmount) || currentAmount < 0) {
      res.status(400).json({ error: "BadRequest", message: "current_amount tidak boleh negatif." });
      return;
    }
    if (!deadline) {
      res.status(400).json({ error: "BadRequest", message: "deadline wajib diisi." });
      return;
    }
    if (!Number.isFinite(reminderDays) || reminderDays < 0) {
      res.status(400).json({ error: "BadRequest", message: "reminder_days tidak valid." });
      return;
    }
    if (recurringAmount > 0 && (!Number.isFinite(recurringAmount) || recurringAmount <= 0 || recurringDay < 1 || recurringDay > 31)) {
      res.status(400).json({ error: "BadRequest", message: "recurring_amount dan recurring_day harus valid." });
      return;
    }

    const { data, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: appUser.id,
        name: name.slice(0, 120),
        target_amount: targetAmount,
        current_amount: currentAmount,
        deadline,
        reminder_days: reminderDays,
        recurring_amount: recurringAmount,
        recurring_day: recurringDay,
        history,
      })
      .select("id, name, target_amount, current_amount, deadline, reminder_days, recurring_amount, recurring_day, history, created_at")
      .single();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }

    res.status(201).json({
      data: {
        id: data.id,
        name: data.name,
        targetAmount: Number(data.target_amount ?? 0),
        currentAmount: Number(data.current_amount ?? 0),
        deadline: data.deadline,
        reminderDays: Number(data.reminder_days ?? 0),
        recurringAmount: Number(data.recurring_amount ?? 0),
        recurringDay: Number(data.recurring_day ?? 0),
        history: Array.isArray(data.history) ? data.history : [],
        createdAt: data.created_at,
      },
    });
    return;
  }

  res.setHeader("Allow", "GET, POST");
  res.status(405).json({ error: "MethodNotAllowed" });
}
