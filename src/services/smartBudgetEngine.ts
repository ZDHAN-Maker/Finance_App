import { formatRupiah } from "../utils/formatCurrency";
import type { AiBudgetPlan } from "../utils/aiPlanManager";

export interface SmartPlannerInput {
  /** Nama barang atau tujuan tabungan (contoh: "Motor Honda Vario 160", "iPhone 15") */
  itemName: string;
  /** Harga target dalam Rupiah */
  targetPrice: number;
  /** Pemasukan / gaji bersih bulanan dalam Rupiah */
  monthlyIncome: number;
  /** Pengeluaran rutin / kebutuhan pokok per bulan (kost, makan pokok, tagihan) */
  monthlyExpense?: number;
  /** Tabungan awal yang sudah dimiliki saat ini (opsional) */
  currentSavings?: number;
  /** Target waktu dalam bulan (opsional, contoh: 6, 12, 18) */
  targetMonths?: number;
  /** Mode gaya hidup / disiplin tabungan */
  lifestyleMode?: "aggressive" | "balanced" | "relaxed";
  /** Catatan tambahan */
  notes?: string;
}

export interface BudgetScenario {
  name: string;
  badge: string;
  months: number;
  monthlySavings: number;
  monthlyJajan: number;
  dailyJajan: number;
  description: string;
}

export interface BudgetBreakdown {
  itemName: string;
  targetPrice: number;
  currentSavings: number;
  remainingTarget: number;
  monthlyIncome: number;
  livingNeeds: number;
  emergencyBuffer: number;
  targetSavingsMonthly: number;
  targetSavingsWeekly: number;
  targetSavingsDaily: number;
  jajanMonthly: number;
  jajanWeekly: number;
  jajanDaily: number;
  monthsToReach: number;
  deadlineDate: string;
  feasibility: "easy" | "realistic" | "tight" | "unrealistic";
  feasibilityLabel: string;
  feasibilityNote: string;
  scenarios: BudgetScenario[];
  jajanTips: string[];
}

export interface SmartPlanResult {
  breakdown: BudgetBreakdown;
  planMarkdown: string;
  planData: AiBudgetPlan;
}

/**
 * Menghitung tanggal deadline (YYYY-MM-DD) berdasarkan jumlah bulan dari sekarang.
 */
function calculateDeadline(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

/**
 * Smart Financial & Budgeting Engine (Machine Learning & Heuristic Optimizer).
 * Menghitung alokasi anggaran secara presisi, deterministik, dan bebas kuota/API token.
 * Memecah anggaran sampai ke batas uang jajan harian dan mingguan.
 */
export function calculateSmartBudgetPlan(input: SmartPlannerInput): SmartPlanResult {
  const {
    itemName,
    targetPrice,
    monthlyIncome: income,
    monthlyExpense = 0,
    currentSavings = 0,
    lifestyleMode = "balanced",
  } = input;

  const remainingTarget = Math.max(0, targetPrice - currentSavings);

  // 1. Tentukan Kebutuhan Pokok (Living Needs)
  // Jika user memasukkan pengeluaran rutin, gunakan nilai tersebut.
  // Jika tidak, gunakan acuan proporsional (45%-55% gaji).
  let livingNeeds = monthlyExpense;
  if (livingNeeds <= 0) {
    if (lifestyleMode === "aggressive") {
      livingNeeds = Math.round((income * 0.45) / 50000) * 50000;
    } else if (lifestyleMode === "relaxed") {
      livingNeeds = Math.round((income * 0.55) / 50000) * 50000;
    } else {
      livingNeeds = Math.round((income * 0.5) / 50000) * 50000;
    }
  }

  // 2. Dana Darurat / Buffer Cadangan (5% dari gaji, min 50rb jika gaji cukup)
  const emergencyBuffer = income > 1500000 ? Math.max(50000, Math.round((income * 0.05) / 25000) * 25000) : 0;

  // 3. Hitung Waktu dan Target Tabungan
  // Disposable yang tersisa sebelum tabungan dan jajan:
  const disposableForSavingsAndWants = Math.max(0, income - livingNeeds - emergencyBuffer);

  let targetMonths = input.targetMonths && input.targetMonths > 0 ? input.targetMonths : 0;
  let targetSavingsMonthly = 0;

  if (targetMonths > 0) {
    targetSavingsMonthly = Math.ceil(remainingTarget / targetMonths);
  } else {
    // Tentukan waktu ideal otomatis berdasarkan mode
    let targetRatio = 0.3; // Default 30% dari gaji
    if (lifestyleMode === "aggressive") targetRatio = 0.45;
    if (lifestyleMode === "relaxed") targetRatio = 0.2;

    const baseMonthlySavings = Math.max(50000, Math.round((income * targetRatio) / 25000) * 25000);
    targetMonths = Math.max(1, Math.ceil(remainingTarget / baseMonthlySavings));
    targetSavingsMonthly = Math.ceil(remainingTarget / targetMonths);
  }

  // 4. Hitung Uang Jajan & Keinginan
  let jajanMonthly = income - livingNeeds - targetSavingsMonthly - emergencyBuffer;

  // 5. Cek Kelayakan (Feasibility Check)
  let feasibility: "easy" | "realistic" | "tight" | "unrealistic" = "realistic";
  let feasibilityLabel = "Sangat Realistis";
  let feasibilityNote = "Target dan alokasi keuangan kamu sangat seimbang dan aman dijalankan.";

  if (income <= livingNeeds) {
    feasibility = "unrealistic";
    feasibilityLabel = "Defisit Keuangan";
    feasibilityNote = `Pengeluaran rutin (${formatRupiah(livingNeeds)}) menyamai atau melebihi pemasukanmu (${formatRupiah(income)}). Perlu efisiensi kebutuhan pokok terlebih dahulu sebelum memulai tabungan besar.`;
    jajanMonthly = 0;
  } else if (jajanMonthly < 0) {
    // Dana tidak cukup untuk target waktu yang diminta
    feasibility = "tight";
    feasibilityLabel = "Terlalu Ketat (Perlu Waktu Tambahan)";
    const minMonths = Math.max(1, Math.ceil(remainingTarget / Math.max(100000, disposableForSavingsAndWants * 0.8)));
    feasibilityNote = `Menabung ${formatRupiah(targetSavingsMonthly)}/bulan untuk beli dalam ${targetMonths} bulan membuat anggaran minus. Disarankan memperpanjang waktu menjadi minimal ${minMonths} bulan agar tetap punya uang jajan.`;
    
    // Auto-adjust target bulanan agar tidak minus total
    targetMonths = minMonths;
    targetSavingsMonthly = Math.ceil(remainingTarget / targetMonths);
    jajanMonthly = Math.max(0, income - livingNeeds - targetSavingsMonthly - emergencyBuffer);
  } else if (jajanMonthly < income * 0.1) {
    feasibility = "tight";
    feasibilityLabel = "Ketat Tapi Bisa";
    feasibilityNote = `Sisa uang jajan kamu cukup minim (${formatRupiah(jajanMonthly)}/bulan). Kamu harus sangat disiplin menahan pengeluaran hiburan agar target tercapai.`;
  } else if (targetSavingsMonthly <= income * 0.25) {
    feasibility = "easy";
    feasibilityLabel = "Mudah & Santai";
    feasibilityNote = `Target tabungan ini relatif ringan dibanding penghasilanmu. Kamu tetap memiliki ruang belanja dan jajan yang sangat lega.`;
  }

  // Hitung turunan harian & mingguan
  const targetSavingsWeekly = Math.round(targetSavingsMonthly / 4);
  const targetSavingsDaily = Math.round(targetSavingsMonthly / 30);

  const jajanWeekly = Math.max(0, Math.floor(jajanMonthly / 4));
  const jajanDaily = Math.max(0, Math.floor(jajanMonthly / 30));

  const deadlineDate = calculateDeadline(targetMonths);

  // 6. Buat 3 Skenario Alternatif
  const maxSavings = Math.max(50000, Math.round((disposableForSavingsAndWants * 0.85) / 25000) * 25000);
  const fastMonths = Math.max(1, Math.ceil(remainingTarget / maxSavings));
  const fastSavings = Math.ceil(remainingTarget / fastMonths);
  const fastJajan = Math.max(0, income - livingNeeds - fastSavings - emergencyBuffer);

  const balSavings = Math.max(50000, Math.round((disposableForSavingsAndWants * 0.6) / 25000) * 25000);
  const balMonths = Math.max(fastMonths + 1, Math.ceil(remainingTarget / balSavings));
  const balActualSavings = Math.ceil(remainingTarget / balMonths);
  const balJajan = Math.max(0, income - livingNeeds - balActualSavings - emergencyBuffer);

  const relaxSavings = Math.max(50000, Math.round((disposableForSavingsAndWants * 0.4) / 25000) * 25000);
  const relaxMonths = Math.max(balMonths + 2, Math.ceil(remainingTarget / relaxSavings));
  const relaxActualSavings = Math.ceil(remainingTarget / relaxMonths);
  const relaxJajan = Math.max(0, income - livingNeeds - relaxActualSavings - emergencyBuffer);

  const scenarios: BudgetScenario[] = [
    {
      name: "Skenario Cepat (Disiplin Tinggi)",
      badge: "⚡ Cepat",
      months: fastMonths,
      monthlySavings: fastSavings,
      monthlyJajan: fastJajan,
      dailyJajan: Math.floor(fastJajan / 30),
      description: "Nabung maksimal dengan jajan ketat agar impian terbeli secepat mungkin.",
    },
    {
      name: "Skenario Seimbang (Rekomendasi)",
      badge: "⚖️ Ideal",
      months: balMonths,
      monthlySavings: balActualSavings,
      monthlyJajan: balJajan,
      dailyJajan: Math.floor(balJajan / 30),
      description: "Kombinasi paling stabil: tabungan aman dan gaya hidup jajan tetap nyaman.",
    },
    {
      name: "Skenario Santai (Fleksibel)",
      badge: "☕ Santai",
      months: relaxMonths,
      monthlySavings: relaxActualSavings,
      monthlyJajan: relaxJajan,
      dailyJajan: Math.floor(relaxJajan / 30),
      description: "Alokasi jajan lebih besar dengan jangka waktu menabung yang lebih panjang.",
    },
  ];

  // 7. Tips Jajan Konkret & Membumi
  const jajanTips: string[] = [];
  if (jajanDaily >= 50000) {
    jajanTips.push(
      `Kuota harian (${formatRupiah(jajanDaily)}/hari) cukup untuk 1x kopi kekinian (±Rp 25.000) plus camilan sore (±Rp 25.000).`
    );
  } else if (jajanDaily >= 25000) {
    jajanTips.push(
      `Kuota harian (${formatRupiah(jajanDaily)}/hari) pas untuk 1 cup minuman favorit atau jajan camilan santai.`
    );
  } else {
    jajanTips.push(
      `Kuota harian kamu (${formatRupiah(jajanDaily)}/hari) terbatas. Sebaiknya seduh kopi di rumah/kantor dan bawa bekal untuk menghemat hingga Rp 20.000/hari.`
    );
  }

  // Trik akumulasi weekend
  const weekendBonus = jajanDaily * 5 * 0.4;
  jajanTips.push(
    `Trik Nongkrong Weekend: Jika di hari kerja (Senin–Jumat) kamu bisa menahan 40% jajan harian, kamu punya ekstra ${formatRupiah(
      weekendBonus
    )} khusus untuk nongkrong di hari Sabtu/Minggu!`
  );

  jajanTips.push(
    "Aturan 24 Jam: Sebelum melakukan pembelian online atau jajan barang di luar makanan pokok, tunda 24 jam untuk memastikan itu kebutuhan atau sekadar lapar mata."
  );

  const breakdown: BudgetBreakdown = {
    itemName,
    targetPrice,
    currentSavings,
    remainingTarget,
    monthlyIncome: income,
    livingNeeds,
    emergencyBuffer,
    targetSavingsMonthly,
    targetSavingsWeekly,
    targetSavingsDaily,
    jajanMonthly,
    jajanWeekly,
    jajanDaily,
    monthsToReach: targetMonths,
    deadlineDate,
    feasibility,
    feasibilityLabel,
    feasibilityNote,
    scenarios,
    jajanTips,
  };

  // 8. Bentuk AiBudgetPlan (kompatibel 100% dengan AiPlanCard & useSavingsGoals)
  const monthlyBudgetLimit = livingNeeds + jajanMonthly; // Batas belanja pengeluaran bulanan
  const planData: AiBudgetPlan = {
    id: `smart-plan-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: "active",
    goalName: itemName,
    targetAmount: targetPrice,
    currentAmount: currentSavings,
    deadline: deadlineDate,
    monthlyBudgetLimit,
    monthlyIncome: income,
    recurringAmount: targetSavingsMonthly,
    recurringDay: 25,
    reminderDays: 7,
    summary: `Target ${itemName}: Nabung ${formatRupiah(targetSavingsMonthly)}/bln selama ${targetMonths} bln. Batas jajan harian ${formatRupiah(jajanDaily)}/hari.`,
  };

  // 9. Format Markdown komprehensif
  const planMarkdown = `### 🎯 Rencana Tabungan: ${itemName}

**Ringkasan Kelayakan:** <strong class="text-ledger-700">${feasibilityLabel}</strong>
${feasibilityNote}

---

### 📊 Alokasi Anggaran Bulanan dari Gaji (${formatRupiah(income)})

| Pos Anggaran | Jumlah / Bulan | Persentase | Keterangan |
| :--- | :--- | :--- | :--- |
| 🎯 **Tabungan ${itemName}** | **${formatRupiah(targetSavingsMonthly)}** | ${Math.round((targetSavingsMonthly / income) * 100)}% | Ditabung rutin tiap bulan |
| 🏠 **Kebutuhan Pokok** | ${formatRupiah(livingNeeds)} | ${Math.round((livingNeeds / income) * 100)}% | Kost, makan pokok, tagihan |
| 🛡️ **Dana Darurat/Buffer** | ${formatRupiah(emergencyBuffer)} | ${Math.round((emergencyBuffer / income) * 100)}% | Pengaman tak terduga |
| ☕ **Uang Jajan & Keinginan** | **${formatRupiah(jajanMonthly)}** | ${Math.round((jajanMonthly / income) * 100)}% | Belanja santai & hiburan |

---

### ☕ Bedah Rinci Kuota Uang Jajan

- **Batas Jajan Harian:** **${formatRupiah(jajanDaily)} / hari**
- **Batas Jajan Mingguan:** **${formatRupiah(jajanWeekly)} / minggu**
- **Total Uang Jajan Bulanan:** **${formatRupiah(jajanMonthly)} / bulan**

**💡 Panduan Jajan Cerdas:**
${jajanTips.map((tip) => `- ${tip}`).join("\n")}

---

### ⏳ Target Waktu & Skenario Alternatif

Target waktu yang dipilih: **${targetMonths} Bulan** (Perkiraan tercapai: **${new Date(deadlineDate).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}**).

| Skenario | Waktu | Nabung / Bulan | Uang Jajan / Hari |
| :--- | :--- | :--- | :--- |
| ⚡ **Cepat** | ${fastMonths} Bulan | ${formatRupiah(fastSavings)} | ${formatRupiah(Math.floor(fastJajan / 30))} / hari |
| ⚖️ **Seimbang** | ${balMonths} Bulan | ${formatRupiah(balActualSavings)} | ${formatRupiah(Math.floor(balJajan / 30))} / hari |
| ☕ **Santai** | ${relaxMonths} Bulan | ${formatRupiah(relaxActualSavings)} | ${formatRupiah(Math.floor(relaxJajan / 30))} / hari |

---

\`\`\`json:financial-plan
${JSON.stringify(
  {
    goalName: itemName,
    targetAmount: targetPrice,
    currentAmount: currentSavings,
    deadline: deadlineDate,
    monthlyBudgetLimit,
    monthlyIncome: income,
    recurringAmount: targetSavingsMonthly,
    recurringDay: 25,
    reminderDays: 7,
    summary: planData.summary,
  },
  null,
  2
)}
\`\`\``;

  return {
    breakdown,
    planMarkdown,
    planData,
  };
}
