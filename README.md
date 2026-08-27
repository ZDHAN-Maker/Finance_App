# Setup Supabase + Telegram — finance-app

Ini BUKAN project baru — ini cuma kumpulan file yang perlu kamu **copy ke dalam**
project `finance-app` yang sudah ada di `C:\Users\upris\Downloads\finance-app`.

## 1. Install dependency dulu

Jalankan di root project `finance-app` (bukan di folder zip ini):

```bash
npm install @supabase/supabase-js @supabase/ssr --legacy-peer-deps
```

Flag `--legacy-peer-deps` dipakai karena project kamu pakai vite v8 yang bentrok
versi peer dependency dengan `@vitejs/plugin-react` — tidak ada hubungannya
dengan Supabase, aman dipakai.

## 2. Copy file-file ini ke project kamu

Struktur zip ini sudah dibuat PERSIS sama posisinya dengan project Next.js kamu,
jadi tinggal copy-paste / merge folder ini ke root `finance-app`:

```
finance-app/                          <- root project kamu
├── .env.local                        <- REPLACE (isi kredensial asli)
├── middleware.ts                     <- BARU, taruh sejajar package.json
└── utils/
    └── supabase/
        ├── client.ts                 <- BARU
        ├── server.ts                 <- BARU
        └── middleware.ts             <- BARU
```

Kalau kamu sudah punya `.env.local` sebelumnya, jangan langsung timpa —
gabungkan isi variabel yang belum ada saja ke file `.env.local` kamu yang lama.

## 3. Apa isi `.env.local` sekarang

Sudah diisi kredensial ASLI dari yang kamu berikan sebelumnya:
- Supabase URL & publishable key ✅
- Telegram bot token ✅
- Telegram webhook secret ✅
- `TELEGRAM_BOT_USERNAME` masih **kosong** — isi sendiri kalau mau dipakai
  di teks instruksi halaman Pengaturan (opsional, tidak wajib).

## 4. Yang masih PERLU kamu buat sendiri (belum ada di sini)

Zip ini baru menyiapkan **koneksi Supabase** dan **environment Telegram**.
Belum termasuk:
- Skema tabel Supabase (transactions, categories, dll)
- API route Next.js untuk terima webhook Telegram (`app/api/telegram/route.ts`)
- Pendaftaran webhook URL ke Telegram lewat endpoint `setWebhook`

Bilang aja kalau mau lanjut ke bagian itu.

## 5. Test cepat setelah copy file

```bash
npm run dev
```

Kalau tidak ada error terkait `@supabase/ssr` atau `process.env` undefined,
koneksi Supabase-nya sudah siap dipakai di Server Component manapun via:

```ts
import { createClient } from '@/utils/supabase/server'
```
