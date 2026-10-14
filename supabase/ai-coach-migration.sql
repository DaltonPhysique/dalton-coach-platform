-- ════════════════════════════════════════════════════════════
-- AI FOOD COACH — chat logs
-- Run this in the Supabase SQL editor. Creates ai_chat_logs,
-- which stores the conversation between each client and the
-- AI food coach (so the client has history, and the coach can
-- see what their clients are asking).
-- ════════════════════════════════════════════════════════════

create table if not exists ai_chat_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_chat_logs_client_id_created_idx
  on ai_chat_logs (client_id, created_at desc);

alter table ai_chat_logs enable row level security;

-- clients: full access to their own chat history
create policy "clients manage own chat logs"
  on ai_chat_logs for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

-- coaches: read their clients' chats (so Dalton can see what's being asked)
create policy "coaches view client chat logs"
  on ai_chat_logs for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));
