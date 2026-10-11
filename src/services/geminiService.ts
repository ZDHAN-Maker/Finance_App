const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent";

// ---------------------------------------------------------------------------
// Free-form AI Chat
// ---------------------------------------------------------------------------

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

const SYSTEM_INSTRUCTION = `Kamu adalah asisten keuangan pribadi cerdas untuk aplikasi pencatat keuangan bernama D'Cash, yang digunakan oleh masyarakat Indonesia.

Tugas utamamu:
- Membantu pengguna merencanakan tabungan, mengatur anggaran, dan mengelola keuangan pribadi
- Menjawab pertanyaan seputar keuangan, investasi, dan perencanaan finansial
- Memberikan saran yang praktis, realistis, dan sesuai kondisi keuangan Indonesia
- Jika pengguna menyebut angka nominal, selalu tampilkan dalam format Rupiah (Rp)
- Berikan analisis dan rekomendasi yang tuntas, utuh, dan terstruktur sampai selesai (jangan terpotong di tengah kalimat)

Gaya komunikasi:
- Gunakan bahasa Indonesia yang friendly, santai tapi tetap profesional
- Jawaban jelas, sistematis, dan actionable
- Gunakan emoji secukupnya agar percakapan lebih hidup

PENTING (AUTO-CONFIG RANCANGAN ANGGARAN):
Setiap kali kamu memberikan rancangan tabungan atau rencana anggaran kepada pengguna (terutama ketika pengguna menyebut target tabungan, gaji/pemasukan, atau pengeluaran), di akhir jawabanmu SELALU sertakan blok JSON terstruktur persis dengan format ini:

```json:financial-plan
{
  "goalName": "Nama target tabungan singkat (misal: Tabungan 10 Juta & Startup)",
  "targetAmount": 10000000,
  "currentAmount": 1100000,
  "deadline": "2028-10-11",
  "monthlyBudgetLimit": 2500000,
  "monthlyIncome": 3800000,
  "recurringAmount": 700000,
  "recurringDay": 25,
  "reminderDays": 7,
  "summary": "Ringkasan 1 kalimat strategi tabungan"
}
```
Pastikan deadline berformat YYYY-MM-DD dan seluruh nominal angka berupa number tanpa titik/koma/Rp.`;

/**
 * Kirim pesan ke Gemini dengan riwayat percakapan penuh (multi-turn).
 */
export async function sendChatMessage(
  history: ChatMessage[],
  userMessage: string
): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY belum diset.");
  }

  const systemTurn = [
    { role: "user", parts: [{ text: SYSTEM_INSTRUCTION }] },
    {
      role: "model",
      parts: [{ text: "Siap! Saya akan membantu kamu mengelola keuangan dengan bijak 💰" }],
    },
  ];

  const historyTurns = history.map((m) => ({
    role: m.role,
    parts: [{ text: m.text }],
  }));

  const body = {
    contents: [
      ...systemTurn,
      ...historyTurns,
      { role: "user", parts: [{ text: userMessage }] },
    ],
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  };

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
  if (!text) throw new Error("Gemini tidak merespons. Coba lagi.");
  return text;
}

// ---------------------------------------------------------------------------
// Savings Plan (existing)
// ---------------------------------------------------------------------------

export interface SavingsPlanInput {
  /** Nama barang / tujuan tabungan */
  itemName: string;
  /** Harga target dalam Rupiah */
  targetPrice: number;
  /** Pemasukan / gaji bersih per bulan */
  monthlyIncome: number;
  /** Total pengeluaran rutin per bulan (opsional) */
  monthlyExpense?: number;
  /** Tabungan yang sudah dimiliki saat ini (opsional) */
  currentSavings?: number;
  /** Catatan tambahan dari user (opsional, misalnya: "saya juga punya cicilan motor 500rb") */
  notes?: string;
}

export interface GeminiResponse {
  plan: string;
  /** true ketika berhasil dari API, false ketika pakai fallback lokal */
  fromApi: boolean;
}

function buildPrompt(input: SavingsPlanInput): string {
  const {
    itemName,
    targetPrice,
    monthlyIncome,
    monthlyExpense = 0,
    currentSavings = 0,
    notes,
  } = input;

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n);

  const disposable = monthlyIncome - monthlyExpense;
  const remaining = Math.max(targetPrice - currentSavings, 0);

  return `Kamu adalah konsultan keuangan pribadi yang ahli di bidang perencanaan tabungan untuk masyarakat Indonesia.

Saya ingin membuat rancangan tabungan yang detail dan realistis untuk tujuan berikut:

**Tujuan:** ${itemName}
**Harga target:** ${formatRp(targetPrice)}
**Pemasukan bersih per bulan:** ${formatRp(monthlyIncome)}
**Pengeluaran rutin per bulan:** ${formatRp(monthlyExpense > 0 ? monthlyExpense : 0)}
**Uang yang sudah tersedia:** ${formatRp(currentSavings)}
**Sisa yang perlu ditabung:** ${formatRp(remaining)}
**Uang bebas (disposable income):** ${formatRp(Math.max(disposable, 0))}${notes ? `\n**Catatan tambahan:** ${notes}` : ""}

Tolong buatkan rancangan tabungan yang sangat rinci dan actionable, mencakup:

1. **Ringkasan Situasi Keuangan** — analisis singkat kondisi keuangan saya sekarang
2. **Strategi Pembagian Uang** — rekomendasi alokasi bulanan (kebutuhan / keinginan / tabungan), sesuaikan dengan kondisi saya
3. **Target Tabungan per Periode** — berapa yang harus ditabung per hari, per minggu, dan per bulan untuk mencapai tujuan
4. **Timeline Pencapaian** — estimasi kapan target bisa tercapai dengan beberapa skenario (hemat ketat, normal, santai)
5. **Tips Penghematan Praktis** — 3-5 tips konkret untuk mempercepat pencapaian tujuan ini
6. **Peringatan & Risiko** — hal-hal yang perlu diwaspadai

Format jawaban dengan markdown yang rapi, gunakan tabel jika perlu, dan pastikan semua angka dalam Rupiah (IDR). Gunakan bahasa Indonesia yang friendly dan mudah dipahami.

PENTING: Di baris paling akhir jawabanmu, sertakan blok konfigurasi ini secara persis:
\`\`\`json:financial-plan
{
  "goalName": "${itemName}",
  "targetAmount": ${targetPrice},
  "currentAmount": ${currentSavings},
  "deadline": "YYYY-MM-DD",
  "monthlyBudgetLimit": 0,
  "monthlyIncome": ${monthlyIncome},
  "recurringAmount": 0,
  "recurringDay": 25,
  "reminderDays": 7,
  "summary": "Ringkasan 1 kalimat strategi tabungan ini"
}
\`\`\`
(Isi nilai deadline YYYY-MM-DD, monthlyBudgetLimit, recurringAmount, dan summary sesuai hasil perhitungan rekomendasimu)`;
}

export async function generateSavingsPlan(
  input: SavingsPlanInput
): Promise<GeminiResponse> {
  if (!GEMINI_API_KEY) {
    throw new Error(
      "VITE_GEMINI_API_KEY belum diset. Tambahkan ke file .env dan restart dev server."
    );
  }

  const body = {
    contents: [
      {
        parts: [{ text: buildPrompt(input) }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 8192,
    },
  };

  const res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };

  const text =
    data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

  if (!text) {
    throw new Error("Gemini tidak mengembalikan teks. Coba lagi.");
  }

  return { plan: text, fromApi: true };
}

