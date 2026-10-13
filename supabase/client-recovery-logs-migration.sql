-- ============================================================
-- The Rebuild — Client recovery check-ins
-- Run this once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
-- Powers the client app's Recovery tab (5 daily sliders, 1–5 each).
-- ============================================================

create table if not exists client_recovery_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  log_date date not null default current_date,
  sleep int not null check (sleep between 1 and 5),
  energy int not null check (energy between 1 and 5),
  soreness int not null check (soreness between 1 and 5),
  stress int not null check (stress between 1 and 5),
  digestion int not null check (digestion between 1 and 5),
  created_at timestamptz not null default now(),
  unique(client_id, log_date)
);

alter table client_recovery_logs enable row level security;

-- Clients can view their own recovery logs
create policy "clients can view own recovery logs"
  on client_recovery_logs for select
  using (client_id = auth.uid());

-- Clients can log their own recovery
create policy "clients can insert own recovery logs"
  on client_recovery_logs for insert
  with check (client_id = auth.uid());

-- Clients can update their own recovery logs
create policy "clients can update own recovery logs"
  on client_recovery_logs for update
  using (client_id = auth.uid());

-- Coaches can view their clients' recovery logs
create policy "coaches can view clients' recovery logs"
  on client_recovery_logs for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));
