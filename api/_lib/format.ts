const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export function formatRupiah(amount: number): string {
  return rupiahFormatter.format(amount);
}

export function currentMonthKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/** "2026-08" -> { start: "2026-08-01", end: "2026-08-31" } */
export function monthKeyToRange(monthKey: string): { start: string; end: string } {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-12

  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Format bulan tidak valid: "${monthKey}". Gunakan format YYYY-MM.`);
  }

  const start = `${yearStr}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${yearStr}-${monthStr}-${String(lastDay).padStart(2, "0")}`;
  return { start, end };
}
