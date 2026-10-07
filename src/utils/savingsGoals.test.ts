import assert from "node:assert/strict";
import { test } from "node:test";
import { calculateGoalProgress, getNextRecurringDepositDate, getRequiredContribution, shouldApplyRecurringDeposit, summarizeGoalHistory, summarizeGoalPriority, summarizeSavingsPortfolio, summarizeSavingsTrend } from "./savingsGoals";

const DAY_MS = 1000 * 60 * 60 * 24;

const futureDate = new Date(Date.now() + 300 * DAY_MS);
const futureDeadline = futureDate.toISOString().slice(0, 10);

test("calculateGoalProgress menghitung progress dan sisa target dengan benar", () => {
  const result = calculateGoalProgress({
    id: "1",
    name: "Liburan Bali",
    targetAmount: 10000000,
    currentAmount: 4000000,
    deadline: futureDeadline,
    reminderDays: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(result.progressPercent, 40);
  assert.equal(result.remainingAmount, 6000000);
  assert.ok(result.daysLeft >= 290 && result.daysLeft <= 300);
  assert.equal(result.status, "progress");
});

test("getRequiredContribution menghitung nominal yang dibutuhkan per bulan", () => {
  const targetDate = new Date(Date.now() + 30 * DAY_MS);
  const deadline = targetDate.toISOString().slice(0, 10);

  const result = getRequiredContribution({
    targetAmount: 12000000,
    currentAmount: 3000000,
    deadline,
  });

  assert.ok(result.requiredMonthly > 0);
  assert.ok(result.requiredDaily > 0);
  assert.ok(result.message.includes("Rp"));
});

test("summarizeGoalHistory menghitung total dan setoran terakhir dengan benar", () => {
  const result = summarizeGoalHistory([
    { amount: 500000, date: "2026-10-01" },
    { amount: 750000, date: "2026-10-07" },
    { amount: 250000, date: "2026-10-14" },
  ]);

  assert.equal(result.total, 1500000);
  assert.equal(result.latest, 250000);
  assert.equal(result.count, 3);
});

test("summarizeSavingsTrend membentuk pola bulanan dalam 6 bulan terakhir", () => {
  const result = summarizeSavingsTrend([
    { amount: 100000, date: "2026-05-10" },
    { amount: 150000, date: "2026-06-09" },
    { amount: 200000, date: "2026-06-17" },
    { amount: 300000, date: "2026-07-05" },
    { amount: 175000, date: "2026-08-12" },
  ]);

  assert.equal(result.length, 6);
  assert.equal(result[0].month.slice(0, 7), "2026-05");
  assert.equal(result[0].total, 100000);
  assert.equal(result[1].total, 350000);
  assert.equal(result[2].total, 300000);
  assert.equal(result[3].total, 175000);
  assert.ok(result.every((item) => item.label.length > 0));
});

test("shouldApplyRecurringDeposit hanya mengeksekusi satu kali per bulan pada tanggal yang tepat", () => {
  const today = new Date("2026-10-15T08:00:00");
  const goal = {
    id: "goal-1",
    name: "Dana darurat",
    targetAmount: 2000000,
    currentAmount: 500000,
    deadline: "2027-01-15",
    reminderDays: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
    recurringAmount: 250000,
    recurringDay: 15,
  };

  assert.equal(shouldApplyRecurringDeposit(goal, today), true);
  assert.equal(shouldApplyRecurringDeposit(goal, new Date("2026-10-14T08:00:00")), false);
  assert.equal(shouldApplyRecurringDeposit({ ...goal, recurringDay: 20 }, today), false);
});

test("calculateGoalProgress menyediakan estimasi tanggal selesai yang valid", () => {
  const result = calculateGoalProgress({
    id: "goal-forecast",
    name: "Dana pendidikan",
    targetAmount: 12000000,
    currentAmount: 2000000,
    deadline: "2027-06-30",
    reminderDays: 7,
    createdAt: "2026-01-01T00:00:00.000Z",
  });

  assert.ok(result.estimatedFinishDate);
  const parsed = new Date(`${result.estimatedFinishDate}T00:00:00`);
  assert.ok(!Number.isNaN(parsed.getTime()));
  assert.ok(parsed.getTime() >= Date.now());
});

test("summarizeSavingsPortfolio menghitung total progress tabungan semua target", () => {
  const result = summarizeSavingsPortfolio([
    { id: "1", name: "Dana darurat", targetAmount: 10000000, currentAmount: 6000000, deadline: "2027-01-31", reminderDays: 7, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "2", name: "Liburan", targetAmount: 6000000, currentAmount: 3000000, deadline: "2027-02-15", reminderDays: 7, createdAt: "2026-01-01T00:00:00.000Z" },
  ]);

  assert.equal(result.totalTarget, 16000000);
  assert.equal(result.totalSaved, 9000000);
  assert.equal(result.totalProgressPercent, 56);
  assert.equal(result.activeGoals, 2);
});

test("summarizeGoalPriority mengurutkan target yang paling mendesak dengan rekomendasi yang jelas", () => {
  const result = summarizeGoalPriority([
    { id: "1", name: "Dana darurat", targetAmount: 15000000, currentAmount: 4000000, deadline: "2026-10-20", reminderDays: 7, createdAt: "2026-01-01T00:00:00.000Z" },
    { id: "2", name: "Liburan", targetAmount: 12000000, currentAmount: 9000000, deadline: "2027-02-15", reminderDays: 14, createdAt: "2026-01-01T00:00:00.000Z" },
  ]);

  assert.equal(result[0].id, "1");
  assert.ok(result[0].reason.toLowerCase().includes("prioritas") || result[0].reason.toLowerCase().includes("mendesak"));
  assert.ok(result[0].requiredMonthly > 0);
});

test("getNextRecurringDepositDate menghitung tanggal setoran otomatis berikutnya", () => {
  const result = getNextRecurringDepositDate({ recurringAmount: 500000, recurringDay: 15 }, new Date("2026-10-07T08:00:00"));

  assert.equal(result.getDate(), 15);
  assert.equal(result.getMonth(), 9);
});
