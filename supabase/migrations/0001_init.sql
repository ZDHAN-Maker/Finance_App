-- =====================================================================
-- MIGRASI 0001: Skema inti aplikasi pencatatan keuangan
-- Tabel: users, categories, transactions
-- + trigger updated_at, trigger auto-create user profile, RLS policies
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- FUNCTION: auto-update kolom updated_at setiap kali row di-UPDATE
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =====================================================================
-- TABLE: users
-- Menghubungkan identitas Supabase Auth (PWA) dengan Telegram user_id.
-- =====================================================================
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  telegram_id bigint unique,
  telegram_link_code text unique,
  telegram_link_code_expires_at timestamptz,
  name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_telegram_id_idx on public.users (telegram_id);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- TRIGGER: setiap ada user baru mendaftar lewat Supabase Auth (PWA),
-- otomatis buat baris profil di public.users.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (auth_user_id, name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1))
  )
  on conflict (auth_user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =====================================================================
-- TABLE: categories
-- user_id NULL = kategori global/default (tersedia untuk semua user).
-- =====================================================================
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users (id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense')),
  keywords text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name, type)
);

create index if not exists categories_user_id_idx on public.categories (user_id);

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- =====================================================================
-- TABLE: transactions
-- =====================================================================
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  category_id uuid references public.categories (id) on delete set null,
  type text not null check (type in ('income', 'expense')),
  amount numeric(14, 2) not null check (amount > 0),
  description text not null default '',
  source text not null default 'pwa' check (source in ('pwa', 'telegram')),
  transaction_date date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists transactions_user_date_idx
  on public.transactions (user_id, transaction_date desc);
create index if not exists transactions_user_category_idx
  on public.transactions (user_id, category_id);

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- =====================================================================
-- ROW LEVEL SECURITY
-- Prinsip: user hanya bisa akses baris miliknya sendiri, dicocokkan
-- lewat public.users.auth_user_id = auth.uid().
-- =====================================================================

alter table public.users enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

-- --- users -------------------------------------------------------------
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own"
  on public.users for select
  using (auth_user_id = auth.uid());

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own"
  on public.users for update
  using (auth_user_id = auth.uid())
  with check (auth_user_id = auth.uid());

-- Catatan: INSERT ke public.users ditangani oleh trigger
-- handle_new_auth_user() (security definer), bukan langsung oleh client.

-- --- categories ----------------------------------------------------------
drop policy if exists "categories_select_own_or_global" on public.categories;
create policy "categories_select_own_or_global"
  on public.categories for select
  using (
    user_id is null
    or user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
  on public.categories for insert
  with check (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
  on public.categories for update
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "categories_delete_own" on public.categories;
create policy "categories_delete_own"
  on public.categories for delete
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

-- --- transactions --------------------------------------------------------
drop policy if exists "transactions_select_own" on public.transactions;
create policy "transactions_select_own"
  on public.transactions for select
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "transactions_insert_own" on public.transactions;
create policy "transactions_insert_own"
  on public.transactions for insert
  with check (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "transactions_update_own" on public.transactions;
create policy "transactions_update_own"
  on public.transactions for update
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "transactions_delete_own" on public.transactions;
create policy "transactions_delete_own"
  on public.transactions for delete
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

-- Catatan: Telegram webhook TIDAK punya JWT Supabase Auth, sehingga
-- request dari webhook memakai SUPABASE_SERVICE_ROLE_KEY (server-side
-- saja, lihat api/_lib/supabaseAdmin.ts) yang otomatis melewati RLS.
-- Endpoint webhook wajib memvalidasi telegram_id -> users.id secara
-- manual sebelum melakukan insert/update apa pun (lihat api/telegram/webhook.ts).
