-- ============================================================
-- The Rebuild — RP-style mesocycle training
-- Run this once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
--
-- Powers the mesocycle-driven Train tab:
--   mesocycle_templates  — coach-built reusable programs
--   template_exercises   — exercises per session day in a template
--   client_mesocycles    — a template assigned to a client
--   set_logs             — per-set weight × reps × RIR logs
--
-- Progression is COMPUTED in the app (src/lib/mesocycle.js) from
-- set_logs — nothing is pre-written per week, so the engine can
-- never drift out of sync with what the client actually lifted.
-- ============================================================

create table if not exists mesocycle_templates (
  id uuid primary key default gen_random_uuid(),
  coach_id uuid not null references profiles(id) on delete cascade,
  name text not null,
  weeks int not null check (weeks between 2 and 8),
  created_at timestamptz not null default now()
);

create table if not exists template_exercises (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references mesocycle_templates(id) on delete cascade,
  session_day text not null,
  exercise text not null,
  sets int not null check (sets between 1 and 10),
  rep_min int not null check (rep_min >= 1),
  rep_max int not null check (rep_max >= rep_min),
  target_rir int not null check (target_rir between 0 and 5),
  start_weight numeric not null default 0,
  sort_order int not null default 0
);

create table if not exists client_mesocycles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  template_id uuid not null references mesocycle_templates(id) on delete restrict,
  start_date date not null default current_date,
  status text not null default 'active' check (status in ('active', 'completed')),
  created_at timestamptz not null default now()
);

create table if not exists set_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  mesocycle_id uuid not null references client_mesocycles(id) on delete cascade,
  week_number int not null check (week_number >= 1),
  log_date date not null default current_date,
  session_day text not null,
  exercise text not null,
  set_number int not null check (set_number >= 1),
  weight numeric not null check (weight >= 0),
  reps int not null check (reps >= 0),
  rir int not null check (rir between 0 and 10),
  created_at timestamptz not null default now(),
  unique(client_id, mesocycle_id, week_number, session_day, exercise, set_number)
);

alter table mesocycle_templates enable row level security;
alter table template_exercises enable row level security;
alter table client_mesocycles enable row level security;
alter table set_logs enable row level security;

-- ── mesocycle_templates ──────────────────────────────────────
-- Coaches manage their own templates.
create policy "coaches manage own templates"
  on mesocycle_templates for all
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid());

-- Clients can read the template behind their active mesocycle.
create policy "clients read assigned template"
  on mesocycle_templates for select
  using (id in (select template_id from client_mesocycles where client_id = auth.uid()));

-- ── template_exercises ───────────────────────────────────────
-- Coaches manage exercises on their own templates.
create policy "coaches manage own template exercises"
  on template_exercises for all
  using (template_id in (select id from mesocycle_templates where coach_id = auth.uid()))
  with check (template_id in (select id from mesocycle_templates where coach_id = auth.uid()));

-- Clients can read exercises of their assigned template.
create policy "clients read assigned template exercises"
  on template_exercises for select
  using (template_id in (select template_id from client_mesocycles where client_id = auth.uid()));

-- ── client_mesocycles ────────────────────────────────────────
-- Clients see their own mesocycles.
create policy "clients view own mesocycles"
  on client_mesocycles for select
  using (client_id = auth.uid());

-- Coaches assign / manage mesocycles for their clients.
create policy "coaches manage client mesocycles"
  on client_mesocycles for all
  using (client_id in (select id from profiles where coach_id = auth.uid()))
  with check (client_id in (select id from profiles where coach_id = auth.uid()));

-- ── set_logs ─────────────────────────────────────────────────
-- Clients view and log their own sets.
create policy "clients view own set logs"
  on set_logs for select
  using (client_id = auth.uid());

create policy "clients insert own set logs"
  on set_logs for insert
  with check (client_id = auth.uid());

-- Coaches view their clients' set logs.
create policy "coaches view client set logs"
  on set_logs for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));
