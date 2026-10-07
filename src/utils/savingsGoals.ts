import { formatRupiah } from "./formatCurrency";

export interface SavingsGoalHistoryItem {
  amount: number;
  date: string;
  note?: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  reminderDays: number;
  createdAt: string;
  recurringAmount?: number;
  recurringDay?: number;
  history?: SavingsGoalHistoryItem[];
}

export interface SavingsGoalProgress {
  targetAmount: number;
  currentAmount: number;
  remainingAmount: number;
  progressPercent: number;
  daysLeft: number;
  status: "done" | "progress" | "warning" | "late";
  requiredMonthly: number;
  requiredDaily: number;
  estimatedFinishDate: string | null;
  message: string;
}

const DAY_MS = 1000 * 60 * 60 * 24;

function getDaysLeft(deadline: string): number {
  const targetDate = new Date(`${deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  targetDate.setHours(0, 0, 0, 0);

  return Math.ceil((targetDate.getTime() - today.getTime()) / DAY_MS);
}

export function getRequiredContribution(goal: Pick<SavingsGoal, "targetAmount" | "currentAmount" | "deadline">) {
  const targetAmount = Math.max(goal.targetAmount, 0);
  const currentAmount = Math.max(goal.currentAmount, 0);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const daysLeft = Math.max(getDaysLeft(goal.deadline), 1);
  const monthsLeft = Math.max(daysLeft / 30.4375, 1);

  const requiredMonthly = remainingAmount === 0 ? 0 : remainingAmount / monthsLeft;
  const requiredDaily = remainingAmount === 0 ? 0 : remainingAmount / daysLeft;

  return {
    remainingAmount,
    daysLeft,
    requiredMonthly,
    requiredDaily,
    message:
      remainingAmount === 0
        ? "Target sudah tercapai."
        : `Butuh ${formatRupiah(requiredMonthly)} per bulan atau ${formatRupiah(requiredDaily)} per hari untuk capai target.`,
  };
}

export function summarizeGoalHistory(history: SavingsGoalHistoryItem[] = []) {
  const items = Array.isArray(history) ? history : [];
  const total = items.reduce((sum, item) => sum + Math.max(item.amount, 0), 0);
  const latest = items.length > 0 ? items[items.length - 1].amount : 0;

  return {
    total,
    latest,
    count: items.length,
  };
}

export function shouldApplyRecurringDeposit(goal: Pick<SavingsGoal, "recurringAmount" | "recurringDay">, date = new Date()) {
  const amount = Number(goal.recurringAmount ?? 0);
  const day = Number(goal.recurringDay ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return false;
  if (!Number.isInteger(day) || day < 1 || day > 31) return false;
  return date.getDate() === day;
}

export interface SavingsTrendPoint {
  month: string;
  label: string;
  total: number;
  count: number;
}

function getMonthKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function summarizeSavingsTrend(history: SavingsGoalHistoryItem[] = [], months = 6): SavingsTrendPoint[] {
  const items = Array.isArray(history) ? history : [];

  if (items.length === 0) {
    const now = new Date();
    return Array.from({ length: months }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1);
      return {
        month: getMonthKey(monthDate),
        label: monthDate.toLocaleDateString("id-ID", { month: "short" }),
        total: 0,
        count: 0,
      };
    });
  }

  const byMonth = new Map<string, { total: number; count: number }>();
  const parsedDates = items
    .map((entry) => ({ ...entry, date: new Date(`${entry.date}T00:00:00`) }))
    .filter((entry) => !Number.isNaN(entry.date.getTime()))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  if (parsedDates.length === 0) {
    return Array.from({ length: months }, (_, index) => {
      const monthDate = new Date();
      monthDate.setMonth(monthDate.getMonth() - (months - index - 1));
      return {
        month: getMonthKey(monthDate),
        label: monthDate.toLocaleDateString("id-ID", { month: "short" }),
        total: 0,
        count: 0,
      };
    });
  }

  parsedDates.forEach((entry) => {
    const monthKey = getMonthKey(entry.date);
    const existing = byMonth.get(monthKey) ?? { total: 0, count: 0 };
    existing.total += Math.max(entry.amount, 0);
    existing.count += 1;
    byMonth.set(monthKey, existing);
  });

  const start = new Date(parsedDates[0].date.getFullYear(), parsedDates[0].date.getMonth(), 1);

  return Array.from({ length: months }, (_, index) => {
    const monthDate = new Date(start.getFullYear(), start.getMonth() + index, 1);
    const monthKey = getMonthKey(monthDate);
    const value = byMonth.get(monthKey) ?? { total: 0, count: 0 };

    return {
      month: monthKey,
      label: monthDate.toLocaleDateString("id-ID", { month: "short" }),
      total: value.total,
      count: value.count,
    };
  });
}

export function calculateGoalProgress(goal: SavingsGoal): SavingsGoalProgress {
  const targetAmount = Math.max(goal.targetAmount, 0);
  const currentAmount = Math.max(goal.currentAmount, 0);
  const remainingAmount = Math.max(targetAmount - currentAmount, 0);
  const progressPercent = targetAmount === 0 ? 0 : Math.min(Math.round((currentAmount / targetAmount) * 100), 100);
  const daysLeft = getDaysLeft(goal.deadline);

  let status: SavingsGoalProgress["status"] = "progress";
  if (currentAmount >= targetAmount) {
    status = "done";
  } else if (daysLeft <= 0) {
    status = "late";
  }

  const contribution = getRequiredContribution(goal);
  let estimatedFinishDate: string | null = null;

  if (remainingAmount > 0 && contribution.requiredMonthly > 0) {
    const estimateMonths = Math.max(Math.ceil(remainingAmount / contribution.requiredMonthly), 1);
    const estimated = new Date();
    estimated.setMonth(estimated.getMonth() + estimateMonths);
    estimated.setDate(1);
    estimated.setHours(0, 0, 0, 0);
    estimatedFinishDate = estimated.toISOString().slice(0, 10);
  } else if (currentAmount >= targetAmount) {
    estimatedFinishDate = goal.deadline;
  }

  const estimatedText = estimatedFinishDate
    ? ` Estimasi selesai ${new Date(`${estimatedFinishDate}T00:00:00`).toLocaleDateString("id-ID", { month: "short", year: "numeric" })}.`
    : "";

  return {
    targetAmount,
    currentAmount,
    remainingAmount,
    progressPercent,
    daysLeft,
    status,
    requiredMonthly: contribution.requiredMonthly,
    requiredDaily: contribution.requiredDaily,
    estimatedFinishDate,
    message: `${contribution.message}${estimatedText}`,
  };
}
