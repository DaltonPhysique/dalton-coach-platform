-- ============================================================
-- The Rebuild — Client food logging
-- Run this once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
--
-- Powers the client app's Fuel tab food log:
--   food_logs — one row per logged food, grouped by meal.
-- Remaining macros (targets − logged) feed the future AI
-- meal-builder; the numbers are computed in the app, never stored.
-- ============================================================

create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  log_date date not null default current_date,
  meal text not null check (meal in ('breakfast', 'lunch', 'dinner', 'snack')),
  description text not null,
  grams numeric not null check (grams > 0),
  calories numeric not null default 0,
  protein_g numeric not null default 0,
  carbs_g numeric not null default 0,
  fat_g numeric not null default 0,
  fiber_g numeric not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

alter table food_logs enable row level security;

-- Clients view their own food logs
create policy "clients view own food logs"
  on food_logs for select
  using (client_id = auth.uid());

-- Clients log their own food
create policy "clients insert own food logs"
  on food_logs for insert
  with check (client_id = auth.uid());

-- Clients delete their own food logs
create policy "clients delete own food logs"
  on food_logs for delete
  using (client_id = auth.uid());

-- Coaches view their clients' food logs
create policy "coaches view client food logs"
  on food_logs for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));
