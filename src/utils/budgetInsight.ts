export interface BudgetSplit {
  needs: number;
  wants: number;
  saving: number;
}

export interface BudgetHealth {
  remaining: number;
  status: "aman" | "hati-hati" | "over-budget";
  message: string;
}

export interface CashFlowForecast {
  projectedEndBalance: number;
  netFlow: number;
  status: "aman" | "hati-hati" | "over-budget";
  message: string;
}

export interface SpendingInsight {
  topCategory: string;
  topCategoryAmount: number;
  action: string;
  recommendation: string;
}

export interface DailySpendingGuide {
  dailyAllowance: number;
  recommendedSpend: number;
  remainingBudget: number;
  daysLeft: number;
  message: string;
}

export interface FinancialHealthSummary {
  score: number;
  label: "sangat baik" | "baik" | "perlu perhatian" | "berisiko";
  message: string;
  nextAction: string;
}

export function getBudgetSplit(monthlyIncome: number): BudgetSplit {
  const income = Math.max(monthlyIncome, 0);
  return {
    needs: income * 0.6,
    wants: income * 0.2,
    saving: income * 0.2,
  };
}

export function getBudgetHealth(monthlyIncome: number, monthlyExpense: number, budgetLimit: number): BudgetHealth {
  const safeIncome = Math.max(monthlyIncome, 0);
  const safeExpense = Math.max(monthlyExpense, 0);
  const safeBudget = Math.max(budgetLimit, 0);
  const remaining = safeBudget - safeExpense;

  if (safeBudget === 0) {
    return {
      remaining: Math.max(safeIncome - safeExpense, 0),
      status: safeExpense <= safeIncome ? "aman" : "hati-hati",
      message: safeExpense <= safeIncome ? "Pengeluaran masih dalam kapasitas pendapatan." : "Pengeluaran mendekati atau melebihi pendapatan bulan ini.",
    };
  }

  if (remaining >= 0) {
    return {
      remaining,
      status: "aman",
      message: "Masih aman, pengeluaran Anda masih di bawah batas anggaran bulan ini.",
    };
  }

  if (remaining < 0 && remaining > -safeBudget * 0.2) {
    return {
      remaining,
      status: "hati-hati",
      message: "Sudah mendekati batas anggaran. Mulai kurangi pengeluaran yang tidak prioritas.",
    };
  }

  return {
    remaining,
    status: "over-budget",
    message: "Anda sudah melewati batas anggaran bulan ini. Perlu pengurangan pengeluaran segera.",
  };
}

export function getCashFlowForecast(monthlyIncome: number, monthlyExpense: number, currentBalance: number): CashFlowForecast {
  const safeIncome = Math.max(monthlyIncome, 0);
  const safeExpense = Math.max(monthlyExpense, 0);
  const safeBalance = Math.max(currentBalance, 0);
  const netFlow = safeIncome - safeExpense;
  const projectedEndBalance = safeBalance + netFlow;

  if (safeExpense <= safeIncome) {
    return {
      projectedEndBalance,
      netFlow,
      status: "aman",
      message: `proyeksi saldo akhir bulan adalah ${projectedEndBalance.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}.`,
    };
  }

  if (netFlow > -safeExpense * 0.2) {
    return {
      projectedEndBalance,
      netFlow,
      status: "hati-hati",
      message: `Proyeksi saldo masih bisa aman, tapi pengeluaran mulai lebih tinggi dari pendapatan.`,
    };
  }

  return {
    projectedEndBalance,
    netFlow,
    status: "over-budget",
    message: `Proyeksi arus kas sedang berat; pengeluaran melebihi pendapatan dan perlu dikurangi.`,
  };
}

export function getSpendingInsight(monthlyIncome: number, breakdown: Array<{ name: string; amount: number; percentage?: number }> = []): SpendingInsight {
  const safeIncome = Math.max(monthlyIncome, 0);
  const safeBreakdown = Array.isArray(breakdown) ? breakdown : [];
  const top = safeBreakdown.reduce<{ name: string; amount: number; percentage?: number } | null>((best, current) => {
    if (!best || current.amount > best.amount) return current;
    return best;
  }, null);

  if (!top) {
    return {
      topCategory: "Belum ada data",
      topCategoryAmount: 0,
      action: "Mulai catat transaksi agar insight pengeluaran lebih akurat.",
      recommendation: `Target ideal untuk tabungan: ${safeIncome > 0 ? (safeIncome * 0.2).toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }) : "Rp0"}.`,
    };
  }

  const action = `Kurangi pengeluaran di ${top.name} sekitar ${top.amount.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })} agar anggaran lebih sehat.`;
  const recommendation = `Prioritaskan penghematan di ${top.name} sebelum mengalokasikan dana untuk kebutuhan lain.`;

  return {
    topCategory: top.name,
    topCategoryAmount: top.amount,
    action,
    recommendation,
  };
}

export function getDailySpendingGuide(
  monthlyIncome: number,
  monthlyExpense: number,
  budgetLimit: number,
  daysLeft: number
): DailySpendingGuide {
  const safeIncome = Math.max(monthlyIncome, 0);
  const safeExpense = Math.max(monthlyExpense, 0);
  const safeLimit = Math.max(budgetLimit, 0);
  const normalizedDays = Math.max(daysLeft, 1);
  const remainingBudget = Math.max(safeLimit - safeExpense, safeIncome - safeExpense);
  const dailyAllowance = Math.max(remainingBudget / normalizedDays, 0);
  const recommendedSpend = Math.min(dailyAllowance, safeIncome / normalizedDays);

  return {
    dailyAllowance,
    recommendedSpend,
    remainingBudget,
    daysLeft: normalizedDays,
    message: `Sisa anggaran yang aman untuk hari ini adalah ${dailyAllowance.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })} selama ${normalizedDays} hari tersisa.`,
  };
}

export function getFinancialHealthSummary(
  monthlyIncome: number,
  monthlyExpense: number,
  savingsProgressPercent: number,
  budgetLimit: number
): FinancialHealthSummary {
  const safeIncome = Math.max(monthlyIncome, 0);
  const safeExpense = Math.max(monthlyExpense, 0);
  const safeBudgetLimit = Math.max(budgetLimit, 0);
  const expenseRatio = safeIncome === 0 ? 0 : Math.min(safeExpense / safeIncome, 1.2);
  const savingsRatio = Math.max(0, Math.min(savingsProgressPercent, 100)) / 100;
  const budgetBuffer = safeBudgetLimit === 0 ? 0 : Math.max(0, 1 - safeExpense / safeBudgetLimit);
  const score = Math.max(0, Math.min(100, Math.round(100 - expenseRatio * 45 + savingsRatio * 25 + budgetBuffer * 20)));

  let label: FinancialHealthSummary["label"]; 
  let message: string;
  let nextAction: string;

  if (score >= 80) {
    label = "sangat baik";
    message = "Arus kas masih sehat dan tabungan Anda berjalan dengan baik.";
    nextAction = "Pertahankan pola menabung dan alokasikan surplus untuk dana darurat atau investasi.";
  } else if (score >= 60) {
    label = "baik";
    message = "Kondisi finansial cukup stabil, tetapi masih ada ruang untuk memperkuat margin aman.";
    nextAction = "Tetap batasi pengeluaran non-prioritas dan tingkatkan setoran otomatis.";
  } else if (score >= 40) {
    label = "perlu perhatian";
    message = "Pengeluaran mulai menekan pendapatan, sehingga cadangan finansial Anda berkurang.";
    nextAction = "Kurangi pengeluaran yang kurang penting dan fokus pada target paling mendesak.";
  } else {
    label = "berisiko";
    message = "Pengeluaran lebih besar dari kapasitas, dan saldo Anda rentan tergerus jika tidak diubah.";
    nextAction = "Prioritaskan pemotongan biaya, naikkan pendapatan tambahan, atau kurangi setoran target nonesensial.";
  }

  return {
    score,
    label,
    message,
    nextAction,
  };
}
