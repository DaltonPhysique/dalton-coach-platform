-- ============================================================
-- The Rebuild — Coach-written meal plans
-- Run this once in Supabase SQL Editor.
--
-- Powers the per-client written meal plan: the coach writes the
-- actual plan ("Meal 1: ...") in plain text, the client sees it
-- on their Fuel tab. This is the coach's brain, not a database —
-- no food search, no macro math here. The AI food coach handles
-- "what did I eat" tracking conversationally via food_logs.
-- ============================================================

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade unique,
  content text not null default '',
  updated_at timestamptz not null default now()
);

alter table meal_plans enable row level security;

-- Clients read their own meal plan
create policy "clients view own meal plan"
  on meal_plans for select
  using (client_id = auth.uid());

-- Coaches manage their clients' meal plans
create policy "coaches manage client meal plans"
  on meal_plans for all
  using (client_id in (select id from profiles where coach_id = auth.uid()))
  with check (client_id in (select id from profiles where coach_id = auth.uid()));
