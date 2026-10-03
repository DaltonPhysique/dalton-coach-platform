-- ============================================================
-- The Rebuild — Coach-editable daily checklist
-- Run this once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
-- ============================================================

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  text text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

alter table checklist_items enable row level security;

-- Clients can view their own checklist items
create policy "clients can view own checklist items"
  on checklist_items for select
  using (client_id = auth.uid());

-- Coaches can view their clients' checklist items
create policy "coaches can view their clients' checklist items"
  on checklist_items for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));

-- Coaches can add checklist items for their clients
create policy "coaches can insert checklist items for their clients"
  on checklist_items for insert
  with check (client_id in (select id from profiles where coach_id = auth.uid()));

-- Coaches can update their clients' checklist items
create policy "coaches can update their clients' checklist items"
  on checklist_items for update
  using (client_id in (select id from profiles where coach_id = auth.uid()));

-- Coaches can delete their clients' checklist items
create policy "coaches can delete their clients' checklist items"
  on checklist_items for delete
  using (client_id in (select id from profiles where coach_id = auth.uid()));
