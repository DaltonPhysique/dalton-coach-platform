-- ============================================================
-- The Rebuild — Client workout logbook (PR entries)
-- Run this once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
-- Powers the client app's Log tab. One row per logged exercise;
-- multiple entries per day are allowed.
-- ============================================================

create table if not exists client_pr_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  log_date date not null default current_date,
  session text,
  exercise text not null,
  set1 text,
  set2 text,
  notes text,
  created_at timestamptz not null default now()
);

alter table client_pr_logs enable row level security;

-- Clients can view their own PR logs
create policy "clients can view own pr logs"
  on client_pr_logs for select
  using (client_id = auth.uid());

-- Clients can log their own PRs
create policy "clients can insert own pr logs"
  on client_pr_logs for insert
  with check (client_id = auth.uid());

-- Coaches can view their clients' PR logs
create policy "coaches can view clients' pr logs"
  on client_pr_logs for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));
