import assert from "node:assert/strict";
import { test } from "node:test";
import {
  getBudgetHealth,
  getBudgetSplit,
  getCashFlowForecast,
  getDailySpendingGuide,
  getFinancialHealthSummary,
  getSpendingInsight,
  isJajanCategory,
  calculateJajanBudgetGuide,
} from "./budgetInsight";

test("getBudgetSplit memberi pembagian 60/20/20 yang masuk akal", () => {
  const result = getBudgetSplit(10000000);
  assert.equal(result.needs, 6000000);
  assert.equal(result.wants, 2000000);
  assert.equal(result.saving, 2000000);
});

test("getBudgetHealth menghitung sisa anggaran dan status", () => {
  const result = getBudgetHealth(10000000, 6500000, 8000000);
  assert.equal(result.status, "aman");
  assert.equal(result.remaining, 1500000);
});

test("getCashFlowForecast menghitung proyeksi saldo akhir bulan dan statusnya", () => {
  const result = getCashFlowForecast(12000000, 8000000, 15000000);
  assert.equal(result.projectedEndBalance, 19000000);
  assert.equal(result.status, "aman");
  assert.ok(result.message.includes("proyeksi"));
});

test("getSpendingInsight memberi rekomendasi kategori paling mahal dan aksi yang jelas", () => {
  const result = getSpendingInsight(15000000, [
    { name: "Makanan", amount: 4500000, percentage: 45 },
    { name: "Transport", amount: 2800000, percentage: 28 },
    { name: "Hiburan", amount: 1200000, percentage: 12 },
  ]);

  assert.equal(result.topCategory, "Makanan");
  assert.equal(result.topCategoryAmount, 4500000);
  assert.ok(result.action.includes("Makanan"));
});

test("getFinancialHealthSummary menghitung skor kesehatan keuangan dan aksi yang jelas", () => {
  const result = getFinancialHealthSummary(12000000, 8000000, 58, 8000000);

  assert.ok(result.score >= 0 && result.score <= 100);
  assert.ok(result.label.length > 0);
  assert.ok(result.nextAction.length > 0);
  assert.ok(result.message.length > 0);
});

test("getDailySpendingGuide menghitung batas belanja harian yang realistis", () => {
  const result = getDailySpendingGuide(12000000, 6000000, 8000000, 26);

  assert.ok(result.dailyAllowance > 0);
  assert.ok(result.message.includes("hari"));
});

test("isJajanCategory mengidentifikasi kategori jajan dengan tepat", () => {
  assert.equal(isJajanCategory("Makanan & Minuman"), true);
  assert.equal(isJajanCategory("Kopi Sore"), true);
  assert.equal(isJajanCategory("Nongkrong Kafe"), true);
  assert.equal(isJajanCategory("Hiburan Bioskop"), true);
  assert.equal(isJajanCategory("Belanja Shopping"), true);

  // Kebutuhan pokok tidak dianggap jajan
  assert.equal(isJajanCategory("Tagihan Listrik"), false);
  assert.equal(isJajanCategory("Sewa Kos"), false);
  assert.equal(isJajanCategory("Bensin Motor"), false);
  assert.equal(isJajanCategory("Gaji"), false);
});

test("calculateJajanBudgetGuide menghitung batasan bulanan, harian, dan jajan dengan benar", () => {
  const guide = calculateJajanBudgetGuide({
    monthlyIncome: 4000000,
    monthlyExpense: 1000000,
    budgetLimit: 3000000,
    todayDateStr: "2026-10-25",
    transactions: [
      {
        type: "expense",
        amount: 25000,
        transaction_date: "2026-10-25",
        category_name: "Kopi & Jajan",
      },
      {
        type: "expense",
        amount: 50000,
        transaction_date: "2026-10-25",
        category_name: "Bensin",
      },
    ],
  });

  assert.equal(guide.monthlyBudget, 3000000);
  assert.equal(guide.monthlyExpense, 1000000);
  assert.equal(guide.remainingMonthlyBudget, 2000000);
  assert.equal(guide.monthlyStatus, "aman");

  // Pengeluaran hari ini total 75.000
  assert.equal(guide.todayTotalSpent, 75000);

  // Pengeluaran jajan hari ini 25.000
  assert.equal(guide.todayJajanSpent, 25000);

  // Jatah jajan per hari harus lebih dari 0
  assert.ok(guide.dailyJajanLimit > 0);
  assert.ok(guide.headline.length > 0);
  assert.ok(guide.notificationMessage.includes("Batas belanja harian"));
});
