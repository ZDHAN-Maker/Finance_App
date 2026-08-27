import { matchCategory, FALLBACK_CATEGORY, TransactionType } from "./categories.js";

export interface ParsedTransaction {
  type: TransactionType;
  amount: number;
  description: string;
  categoryName: string;
}

export interface ParseError {
  error: true;
  message: string;
}

export const MAX_DESCRIPTION_LENGTH = 200;

const EXPENSE_WORDS = /\b(pengeluaran|keluar|expense)\b/i;
const INCOME_WORDS = /\b(pemasukan|masuk|pendapatan|income)\b/i;

// Urutan PENTING: juta/jt harus dicek sebelum ribu/rb, sebelum angka
// biasa — supaya "1jt" tidak salah kebaca sebagai angka "1".
const AMOUNT_PATTERNS: Array<{
  regex: RegExp;
  toAmount: (numStr: string) => number;
}> = [
  {
    // 1jt, 1.5jt, 1,5jt, 2 juta
    regex: /(\d+(?:[.,]\d+)?)\s*(jt|juta)\b/i,
    toAmount: (n) => Math.round(parseFloat(n.replace(",", ".")) * 1_000_000),
  },
  {
    // 30k, 25rb, 25 ribu
    regex: /(\d+(?:[.,]\d+)?)\s*(rb|ribu|k)\b/i,
    toAmount: (n) => Math.round(parseFloat(n.replace(",", ".")) * 1_000),
  },
  {
    // 30.000 (titik sebagai pemisah ribuan)
    regex: /\b(\d{1,3}(?:\.\d{3})+)\b/,
    toAmount: (n) => parseInt(n.replace(/\./g, ""), 10),
  },
  {
    // 30000 (angka polos)
    regex: /\b(\d+)\b/,
    toAmount: (n) => parseInt(n, 10),
  },
];

function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * Parser transaksi deterministik berbasis regex/string matching.
 * Sengaja TIDAK memakai AI/NLP (lihat Bagian 7 & 9 dokumen arsitektur) —
 * cepat, murah, mudah di-debug, dan hasilnya konsisten untuk format
 * yang sudah ditentukan (mis. "30k bensin", "gaji 5jt").
 */
export function parseTransactionMessage(rawText: string): ParsedTransaction | ParseError {
  const original = (rawText ?? "").trim();

  if (!original) {
    return {
      error: true,
      message: "⚠️ Pesan kosong. Contoh: 30k bensin",
    };
  }

  let remainder = original;
  let explicitType: TransactionType | undefined;

  if (EXPENSE_WORDS.test(remainder)) {
    explicitType = "expense";
    remainder = remainder.replace(EXPENSE_WORDS, " ");
  } else if (INCOME_WORDS.test(remainder)) {
    explicitType = "income";
    remainder = remainder.replace(INCOME_WORDS, " ");
  }

  let amount: number | null = null;
  for (const pattern of AMOUNT_PATTERNS) {
    const match = pattern.regex.exec(remainder);
    if (match) {
      amount = pattern.toAmount(match[1]);
      remainder = remainder.slice(0, match.index) + " " + remainder.slice(match.index + match[0].length);
      break;
    }
  }

  if (amount === null || !Number.isFinite(amount) || amount <= 0) {
    return {
      error: true,
      message: "⚠️ Nominal belum ditemukan. Contoh: 30k bensin",
    };
  }

  const descriptionCandidate = collapseWhitespace(remainder);

  const categoryMatch = matchCategory(descriptionCandidate || original, explicitType);
  const type: TransactionType = explicitType ?? categoryMatch?.type ?? "expense";
  const categoryName = categoryMatch?.name ?? FALLBACK_CATEGORY[type];

  const description = (descriptionCandidate || categoryName).slice(0, MAX_DESCRIPTION_LENGTH);

  return { type, amount, description, categoryName };
}

export function isParseError(result: ParsedTransaction | ParseError): result is ParseError {
  return (result as ParseError).error === true;
}
