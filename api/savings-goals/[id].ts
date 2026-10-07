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
  const id = req.query.id;

  if (typeof id !== "string") {
    res.status(400).json({ error: "BadRequest", message: "id target tidak valid." });
    return;
  }

  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("savings_goals")
      .select("id, name, target_amount, current_amount, deadline, reminder_days, recurring_amount, recurring_day, history, created_at")
      .eq("user_id", appUser.id)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "NotFound", message: "Target tabungan tidak ditemukan." });
      return;
    }

    res.status(200).json({
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

  if (req.method === "PUT") {
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = typeof body.name === "string" ? body.name.trim() : "";
      if (!name) {
        res.status(400).json({ error: "BadRequest", message: "name tidak boleh kosong." });
        return;
      }
      update.name = name.slice(0, 120);
    }

    if (body.target_amount !== undefined || body.targetAmount !== undefined) {
      const targetAmount = Number(body.target_amount ?? body.targetAmount ?? 0);
      if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
        res.status(400).json({ error: "BadRequest", message: "target_amount harus lebih dari 0." });
        return;
      }
      update.target_amount = targetAmount;
    }

    if (body.current_amount !== undefined || body.currentAmount !== undefined) {
      const currentAmount = Number(body.current_amount ?? body.currentAmount ?? 0);
      if (!Number.isFinite(currentAmount) || currentAmount < 0) {
        res.status(400).json({ error: "BadRequest", message: "current_amount tidak boleh negatif." });
        return;
      }
      update.current_amount = currentAmount;
    }

    if (body.deadline !== undefined) {
      if (typeof body.deadline !== "string" || !body.deadline) {
        res.status(400).json({ error: "BadRequest", message: "deadline tidak valid." });
        return;
      }
      update.deadline = body.deadline;
    }

    if (body.reminder_days !== undefined || body.reminderDays !== undefined) {
      const reminderDays = Number(body.reminder_days ?? body.reminderDays ?? 0);
      if (!Number.isFinite(reminderDays) || reminderDays < 0) {
        res.status(400).json({ error: "BadRequest", message: "reminder_days tidak valid." });
        return;
      }
      update.reminder_days = reminderDays;
    }

    if (body.recurring_amount !== undefined || body.recurringAmount !== undefined) {
      const recurringAmount = Number(body.recurring_amount ?? body.recurringAmount ?? 0);
      const recurringDay = Number(body.recurring_day ?? body.recurringDay ?? 0);
      if (recurringAmount > 0 && (!Number.isFinite(recurringAmount) || recurringDay < 1 || recurringDay > 31)) {
        res.status(400).json({ error: "BadRequest", message: "recurring_amount dan recurring_day tidak valid." });
        return;
      }
      update.recurring_amount = recurringAmount;
      update.recurring_day = recurringDay;
    }

    if (body.history !== undefined) {
      update.history = normalizeHistory(body.history);
    }

    if (Object.keys(update).length === 0) {
      res.status(400).json({ error: "BadRequest", message: "Tidak ada field yang diubah." });
      return;
    }

    const { data, error } = await supabase
      .from("savings_goals")
      .update(update)
      .eq("user_id", appUser.id)
      .eq("id", id)
      .select("id, name, target_amount, current_amount, deadline, reminder_days, recurring_amount, recurring_day, history, created_at")
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!data) {
      res.status(404).json({ error: "NotFound", message: "Target tabungan tidak ditemukan." });
      return;
    }

    res.status(200).json({
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

  if (req.method === "DELETE") {
    const { error, count } = await supabase
      .from("savings_goals")
      .delete({ count: "exact" })
      .eq("user_id", appUser.id)
      .eq("id", id);

    if (error) {
      res.status(500).json({ error: "DatabaseError", message: error.message });
      return;
    }
    if (!count) {
      res.status(404).json({ error: "NotFound", message: "Target tabungan tidak ditemukan." });
      return;
    }

    res.status(204).end();
    return;
  }

  res.setHeader("Allow", "GET, PUT, DELETE");
  res.status(405).json({ error: "MethodNotAllowed" });
}
