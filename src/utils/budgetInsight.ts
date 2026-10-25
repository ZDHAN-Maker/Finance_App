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


export interface JajanBudgetGuide {
  // Metrik Bulanan
  monthlyBudget: number;
  monthlyExpense: number;
  remainingMonthlyBudget: number;
  monthlyStatus: "aman" | "hati-hati" | "over-budget";

  // Metrik Harian Total
  daysLeft: number;
  dailyTotalLimit: number;
  todayTotalSpent: number;
  todayTotalRemaining: number;
  dailyStatus: "aman" | "hati-hati" | "over-budget";

  // Metrik Jajan / Keinginan (Wants)
  monthlyJajanBudget: number;
  monthlyJajanSpent: number;
  remainingJajanBudget: number;
  dailyJajanLimit: number;
  todayJajanSpent: number;
  todayJajanRemaining: number;
  jajanStatus: "aman" | "waspada" | "over-budget";

  // Pesan ringkasan terintegrasi (dipakai untuk UI & Push Notifikasi HP)
  headline: string;
  notificationMessage: string;
}

export function isJajanCategory(categoryName?: string | null): boolean {
  if (!categoryName) return false;
  const name = categoryName.toLowerCase().trim();
  const jajanKeywords = [
    "makan", "jajan", "kopi", "kafe", "cafe", "snack", "camilan",
    "hiburan", "nonton", "bioskop", "belanja", "shopping", "nongkrong",
    "kuliner", "game", "gaming", "hobi", "lifestyle", "jalan"
  ];
  const essentialKeywords = [
    "tagihan", "listrik", "air", "pdam", "wifi", "internet", "sewa",
    "kos", "kontrakan", "cicilan", "pendidikan", "kesehatan", "obat",
    "asuransi", "pajak", "bensin", "transportasi kerja", "gaji"
  ];

  if (essentialKeywords.some((k) => name.includes(k))) return false;
  return jajanKeywords.some((k) => name.includes(k));
}

export function calculateJajanBudgetGuide(params: {
  monthlyIncome: number;
  monthlyExpense: number;
  budgetLimit: number;
  customJajanBudget?: number;
  transactions?: Array<{
    type: "income" | "expense";
    amount: number;
    transaction_date: string;
    category_name?: string | null;
  }>;
  todayDateStr?: string;
}): JajanBudgetGuide {
  const {
    monthlyIncome,
    monthlyExpense,
    budgetLimit,
    customJajanBudget,
    transactions = [],
    todayDateStr = new Date().toISOString().slice(0, 10),
  } = params;

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth(); // 0-based
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
  const currentDay = today.getDate();
  const daysLeft = Math.max(totalDaysInMonth - currentDay + 1, 1);

  // 1. Batas Bulanan
  const effectiveMonthlyBudget =
    budgetLimit > 0
      ? budgetLimit
      : monthlyIncome > 0
        ? Math.round(monthlyIncome * 0.8)
        : Math.max(monthlyExpense, 1500000);

  const remainingMonthlyBudget = Math.max(effectiveMonthlyBudget - monthlyExpense, 0);
  const monthlyStatus: JajanBudgetGuide["monthlyStatus"] =
    monthlyExpense > effectiveMonthlyBudget
      ? "over-budget"
      : monthlyExpense >= effectiveMonthlyBudget * 0.85
        ? "hati-hati"
        : "aman";

  // 2. Batas Belanja Harian Total
  const dailyTotalLimit = Math.max(Math.round(remainingMonthlyBudget / daysLeft), 0);

  // Hitung pengeluaran hari ini
  const todayExpenses = transactions.filter(
    (t) => t.type === "expense" && t.transaction_date === todayDateStr
  );
  const todayTotalSpent = todayExpenses.reduce((sum, t) => sum + Number(t.amount || 0), 0);
  const todayTotalRemaining = Math.max(dailyTotalLimit - todayTotalSpent, 0);

  const dailyStatus: JajanBudgetGuide["dailyStatus"] =
    todayTotalSpent > dailyTotalLimit && dailyTotalLimit > 0
      ? "over-budget"
      : todayTotalRemaining <= dailyTotalLimit * 0.2
        ? "hati-hati"
        : "aman";

  // 3. Batas Jajan / Keinginan (Wants)
  // Default 25% dari total budget bulanan (atau 20% pemasukan sesuai aturan 60/20/20)
  const defaultJajanBudget =
    customJajanBudget && customJajanBudget > 0
      ? customJajanBudget
      : Math.round(effectiveMonthlyBudget * 0.25);

  const monthlyJajanBudget = Math.max(defaultJajanBudget, 200000);

  // Pengeluaran jajan bulan ini
  const monthlyJajanSpent = transactions
    .filter((t) => t.type === "expense" && isJajanCategory(t.category_name))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const remainingJajanBudget = Math.max(monthlyJajanBudget - monthlyJajanSpent, 0);
  const dailyJajanLimit = Math.max(Math.round(remainingJajanBudget / daysLeft), 0);

  // Jajan yang sudah terpakai hari ini
  const todayJajanSpent = todayExpenses
    .filter((t) => isJajanCategory(t.category_name))
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const todayJajanRemaining = dailyJajanLimit - todayJajanSpent;

  const jajanStatus: JajanBudgetGuide["jajanStatus"] =
    todayJajanRemaining < 0
      ? "over-budget"
      : todayJajanRemaining <= dailyJajanLimit * 0.25
        ? "waspada"
        : "aman";

  const fmtRp = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  let headline = "";
  if (jajanStatus === "over-budget") {
    headline = `⚠️ Jajan hari ini over-budget sebesar ${fmtRp(Math.abs(todayJajanRemaining))}.`;
  } else if (jajanStatus === "waspada") {
    headline = `⚡ Jatah jajan hari ini hampir habis, sisa ${fmtRp(Math.max(todayJajanRemaining, 0))}.`;
  } else {
    headline = `✨ Anggaran jajan hari ini aman: ${fmtRp(Math.max(todayJajanRemaining, 0))} tersisa.`;
  }

  const notificationMessage = `Batas belanja harian: ${fmtRp(dailyTotalLimit)} (Sisa: ${fmtRp(todayTotalRemaining)}). Jatah jajan per hari: ${fmtRp(dailyJajanLimit)} (Sisa jajan hari ini: ${fmtRp(Math.max(todayJajanRemaining, 0))}).`;

  return {
    monthlyBudget: effectiveMonthlyBudget,
    monthlyExpense,
    remainingMonthlyBudget,
    monthlyStatus,
    daysLeft,
    dailyTotalLimit,
    todayTotalSpent,
    todayTotalRemaining,
    dailyStatus,
    monthlyJajanBudget,
    monthlyJajanSpent,
    remainingJajanBudget,
    dailyJajanLimit,
    todayJajanSpent,
    todayJajanRemaining,
    jajanStatus,
    headline,
    notificationMessage,
  };
}
