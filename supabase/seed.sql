-- =====================================================================
-- SEED: kategori default (global, user_id = NULL)
-- Daftar & keyword ini HARUS sinkron dengan api/_lib/categories.ts
-- (dipakai oleh parser Telegram). Jika menambah kategori baru di sini,
-- tambahkan juga keyword-nya di file tersebut, atau sebaliknya.
-- =====================================================================

insert into public.categories (user_id, name, type, keywords) values
  (null, 'Transportasi', 'expense', array['bensin','motor','pertalite','pertamax','ojek','grab','gojek','parkir','tol']),
  (null, 'Makanan',      'expense', array['makan','nasi','ayam','mie','kopi','jajan','warteg','restoran']),
  (null, 'Tagihan',      'expense', array['listrik','pln','air','pdam','tagihan']),
  (null, 'Internet',     'expense', array['internet','wifi','pulsa','paket data','indihome']),
  (null, 'Belanja',      'expense', array['belanja','mall','toko','indomaret','alfamart','supermarket']),
  (null, 'Hiburan',      'expense', array['film','game','karaoke','nonton','bioskop']),
  (null, 'Kesehatan',    'expense', array['obat','klinik','dokter','rumah sakit','apotek']),
  (null, 'Pendidikan',   'expense', array['kursus','buku','sekolah','kuliah','spp']),
  (null, 'Lainnya',      'expense', array[]::text[]),
  (null, 'Gaji',         'income',  array['gaji','salary']),
  (null, 'Freelance',    'income',  array['freelance','proyek','project']),
  (null, 'Bonus',        'income',  array['bonus','thr']),
  (null, 'Lainnya',      'income',  array[]::text[])
on conflict (user_id, name, type) do nothing;
