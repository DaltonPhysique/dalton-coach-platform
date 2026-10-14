-- ============================================================
-- The Rebuild — Nutrition templates (day types) + grocery lists
-- Run this once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
--
-- Powers:
--   nutrition_templates      — coach-built macro presets
--   nutrition_template_days  — per-day-type targets (training/legs/rest)
--   client_nutrition         — template assigned to a client + manual
--                              day override (Auto / Training / Legs / Rest)
--   grocery_templates        — coach-built grocery lists
--   grocery_items            — items grouped by category
--   client_grocery_lists     — lists assigned to a client
--   grocery_checks           — per-day item check-offs
--
-- The client Fuel tab resolves "today's targets" from the assigned
-- template's day rows. Day type is auto-detected (today's logged
-- session, leg keywords) unless the client overrides it manually.
-- ============================================================

-- ── nutrition templates ──────────────────────────────────────
create table if not exists nutrition_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  goal text,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists nutrition_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references nutrition_templates(id) on delete cascade,
  day_type text not null check (day_type in ('training', 'legs', 'rest')),
  calories int,
  protein_g int,
  carbs_g int,
  fat_g int,
  fiber_g int not null default 0,
  unique(template_id, day_type)
);

create table if not exists client_nutrition (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade unique,
  template_id uuid references nutrition_templates(id) on delete set null,
  day_override text check (day_override in ('training', 'legs', 'rest')),
  updated_at timestamptz not null default now()
);

-- ── grocery lists ────────────────────────────────────────────
create table if not exists grocery_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists grocery_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references grocery_templates(id) on delete cascade,
  category text not null,
  item text not null,
  sort_order int not null default 0
);

create table if not exists client_grocery_lists (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  template_id uuid not null references grocery_templates(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(client_id, template_id)
);

create table if not exists grocery_checks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  list_id uuid not null references client_grocery_lists(id) on delete cascade,
  item text not null,
  checked_date date not null default current_date,
  unique(client_id, list_id, item, checked_date)
);

alter table nutrition_templates enable row level security;
alter table nutrition_template_days enable row level security;
alter table client_nutrition enable row level security;
alter table grocery_templates enable row level security;
alter table grocery_items enable row level security;
alter table client_grocery_lists enable row level security;
alter table grocery_checks enable row level security;

-- ── nutrition_templates ──────────────────────────────────────
create policy "coaches manage own nutrition templates"
  on nutrition_templates for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "clients read assigned nutrition template"
  on nutrition_templates for select
  using (id in (select template_id from client_nutrition where client_id = auth.uid()));

-- ── nutrition_template_days ──────────────────────────────────
create policy "coaches manage own nutrition template days"
  on nutrition_template_days for all
  using (template_id in (select id from nutrition_templates where coach_id = auth.uid()))
  with check (template_id in (select id from nutrition_templates where coach_id = auth.uid()));

create policy "clients read assigned nutrition template days"
  on nutrition_template_days for select
  using (template_id in (select template_id from client_nutrition where client_id = auth.uid()));

-- ── client_nutrition ─────────────────────────────────────────
create policy "clients view own nutrition assignment"
  on client_nutrition for select
  using (client_id = auth.uid());

create policy "clients set own day override"
  on client_nutrition for update
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "coaches manage client nutrition"
  on client_nutrition for all
  using (client_id in (select id from profiles where coach_id = auth.uid()))
  with check (client_id in (select id from profiles where coach_id = auth.uid()));

-- ── grocery_templates ────────────────────────────────────────
create policy "coaches manage own grocery templates"
  on grocery_templates for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

create policy "clients read assigned grocery templates"
  on grocery_templates for select
  using (id in (select template_id from client_grocery_lists where client_id = auth.uid()));

-- ── grocery_items ────────────────────────────────────────────
create policy "coaches manage own grocery items"
  on grocery_items for all
  using (template_id in (select id from grocery_templates where coach_id = auth.uid()))
  with check (template_id in (select id from grocery_templates where coach_id = auth.uid()));

create policy "clients read assigned grocery items"
  on grocery_items for select
  using (template_id in (select template_id from client_grocery_lists where client_id = auth.uid()));

-- ── client_grocery_lists ─────────────────────────────────────
create policy "clients view own grocery lists"
  on client_grocery_lists for select
  using (client_id = auth.uid());

create policy "coaches manage client grocery lists"
  on client_grocery_lists for all
  using (client_id in (select id from profiles where coach_id = auth.uid()))
  with check (client_id in (select id from profiles where coach_id = auth.uid()));

-- ── grocery_checks ───────────────────────────────────────────
create policy "clients manage own grocery checks"
  on grocery_checks for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "coaches view client grocery checks"
  on grocery_checks for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));
