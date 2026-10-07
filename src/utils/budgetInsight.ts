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
