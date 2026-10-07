-- =====================================================================
-- MIGRASI 0002: menambahkan tabel target tabungan / savings_goals.
-- =====================================================================

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  deadline date not null,
  reminder_days integer not null default 7 check (reminder_days >= 0),
  recurring_amount numeric(14, 2) not null default 0 check (recurring_amount >= 0),
  recurring_day integer not null default 0 check (recurring_day between 0 and 31),
  history jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists savings_goals_user_deadline_idx
  on public.savings_goals (user_id, deadline);

create index if not exists savings_goals_user_created_idx
  on public.savings_goals (user_id, created_at desc);

drop trigger if exists set_savings_goals_updated_at on public.savings_goals;
create trigger set_savings_goals_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

alter table public.savings_goals enable row level security;

drop policy if exists "savings_goals_select_own" on public.savings_goals;
create policy "savings_goals_select_own"
  on public.savings_goals for select
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "savings_goals_insert_own" on public.savings_goals;
create policy "savings_goals_insert_own"
  on public.savings_goals for insert
  with check (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "savings_goals_update_own" on public.savings_goals;
create policy "savings_goals_update_own"
  on public.savings_goals for update
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );

drop policy if exists "savings_goals_delete_own" on public.savings_goals;
create policy "savings_goals_delete_own"
  on public.savings_goals for delete
  using (
    user_id in (select id from public.users where auth_user_id = auth.uid())
  );
