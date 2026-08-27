export type TransactionType = "income" | "expense";

export interface CategoryRule {
  name: string;
  type: TransactionType;
  /** Kata kunci yang dicari (case-insensitive, substring match) di dalam teks pesan. */
  keywords: string[];
}

// PENTING: daftar & keyword di sini harus sinkron dengan
// supabase/seed.sql (kategori global). Urutan menentukan prioritas —
// keyword pertama yang cocok yang dipakai.
export const DEFAULT_CATEGORY_RULES: CategoryRule[] = [
  { name: "Transportasi", type: "expense", keywords: ["bensin", "motor", "pertalite", "pertamax", "ojek", "grab", "gojek", "parkir", "tol"] },
  { name: "Makanan", type: "expense", keywords: ["makan", "nasi", "ayam", "mie", "kopi", "jajan", "warteg", "restoran"] },
  { name: "Tagihan", type: "expense", keywords: ["listrik", "pln", "air", "pdam", "tagihan"] },
  { name: "Internet", type: "expense", keywords: ["internet", "wifi", "pulsa", "paket data", "indihome"] },
  { name: "Belanja", type: "expense", keywords: ["belanja", "mall", "toko", "indomaret", "alfamart", "supermarket"] },
  { name: "Hiburan", type: "expense", keywords: ["film", "game", "karaoke", "nonton", "bioskop"] },
  { name: "Kesehatan", type: "expense", keywords: ["obat", "klinik", "dokter", "rumah sakit", "apotek"] },
  { name: "Pendidikan", type: "expense", keywords: ["kursus", "buku", "sekolah", "kuliah", "spp"] },
  { name: "Gaji", type: "income", keywords: ["gaji", "salary"] },
  { name: "Freelance", type: "income", keywords: ["freelance", "proyek", "project"] },
  { name: "Bonus", type: "income", keywords: ["bonus", "thr"] },
];

export const FALLBACK_CATEGORY: Record<TransactionType, string> = {
  expense: "Lainnya",
  income: "Lainnya",
};

/**
 * Cari kategori berdasarkan keyword yang muncul di dalam teks.
 * Jika `preferredType` diisi, hanya kategori dengan type tsb yang dicek
 * terlebih dahulu (baru fallback ke kategori lain jika tidak ada yang cocok).
 */
export function matchCategory(
  text: string,
  preferredType?: TransactionType
): { name: string; type: TransactionType } | null {
  const lower = text.toLowerCase();

  const ordered = preferredType
    ? [
        ...DEFAULT_CATEGORY_RULES.filter((r) => r.type === preferredType),
        ...DEFAULT_CATEGORY_RULES.filter((r) => r.type !== preferredType),
      ]
    : DEFAULT_CATEGORY_RULES;

  for (const rule of ordered) {
    for (const keyword of rule.keywords) {
      if (lower.includes(keyword)) {
        return { name: rule.name, type: rule.type };
      }
    }
  }
  return null;
}
