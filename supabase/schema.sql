-- ============================================================
-- Dalton Physique OS — Phase 1 Database Schema
-- Run this entire file once in Supabase SQL Editor
-- (Project → SQL Editor → New Query → paste → Run)
-- ============================================================

-- ------------------------------------------------------------
-- 1. PROFILES
-- Extends auth.users. One row per coach or client.
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('coach', 'client')),
  full_name text not null,
  coach_id uuid references profiles(id) on delete set null,
  start_weight numeric,
  goal_weight numeric,
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user is created.
-- Role/name/coach_id are passed in via signup metadata (see auth code).
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, coach_id, start_weight, goal_weight)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'role', 'client'),
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    (new.raw_user_meta_data->>'coach_id')::uuid,
    (new.raw_user_meta_data->>'start_weight')::numeric,
    (new.raw_user_meta_data->>'goal_weight')::numeric
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------
-- 2. NUTRITION PLANS
-- ------------------------------------------------------------
create table if not exists nutrition_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id),
  training_cal numeric,
  training_protein numeric,
  training_carbs numeric,
  training_fat numeric,
  rest_cal numeric,
  rest_protein numeric,
  rest_carbs numeric,
  rest_fat numeric,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. TRAINING PLANS
-- ------------------------------------------------------------
create table if not exists training_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  created_by uuid not null references profiles(id),
  name text not null,
  split_json jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. WEIGHT LOGS
-- ------------------------------------------------------------
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  log_date date not null default current_date,
  weight numeric not null,
  created_at timestamptz not null default now(),
  unique (client_id, log_date)
);

-- ------------------------------------------------------------
-- 5. PROGRESS PHOTOS
-- (image bytes live in Storage; this table stores the reference)
-- ------------------------------------------------------------
create table if not exists progress_photos (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references profiles(id) on delete cascade,
  angle text not null check (angle in ('front', 'side', 'back')),
  storage_path text not null,
  log_date date not null default current_date,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table nutrition_plans enable row level security;
alter table training_plans enable row level security;
alter table weight_logs enable row level security;
alter table progress_photos enable row level security;

-- ---------- PROFILES ----------
create policy "clients can view own profile"
  on profiles for select
  using (id = auth.uid());

create policy "coaches can view their clients' profiles"
  on profiles for select
  using (coach_id = auth.uid());

create policy "coaches can view their own profile"
  on profiles for select
  using (id = auth.uid());

create policy "clients can update own profile"
  on profiles for update
  using (id = auth.uid());

-- ---------- NUTRITION PLANS ----------
create policy "clients can view own nutrition plans"
  on nutrition_plans for select
  using (client_id = auth.uid());

create policy "coaches can view their clients' nutrition plans"
  on nutrition_plans for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));

create policy "coaches can insert nutrition plans for their clients"
  on nutrition_plans for insert
  with check (client_id in (select id from profiles where coach_id = auth.uid()));

create policy "coaches can update nutrition plans for their clients"
  on nutrition_plans for update
  using (client_id in (select id from profiles where coach_id = auth.uid()));

-- ---------- TRAINING PLANS ----------
create policy "clients can view own training plans"
  on training_plans for select
  using (client_id = auth.uid());

create policy "coaches can view their clients' training plans"
  on training_plans for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));

create policy "coaches can insert training plans for their clients"
  on training_plans for insert
  with check (client_id in (select id from profiles where coach_id = auth.uid()));

create policy "coaches can update training plans for their clients"
  on training_plans for update
  using (client_id in (select id from profiles where coach_id = auth.uid()));

-- ---------- WEIGHT LOGS ----------
create policy "clients can view own weight logs"
  on weight_logs for select
  using (client_id = auth.uid());

create policy "clients can insert own weight logs"
  on weight_logs for insert
  with check (client_id = auth.uid());

create policy "clients can update own weight logs"
  on weight_logs for update
  using (client_id = auth.uid());

create policy "coaches can view their clients' weight logs"
  on weight_logs for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));

-- ---------- PROGRESS PHOTOS ----------
create policy "clients can view own photos"
  on progress_photos for select
  using (client_id = auth.uid());

create policy "clients can insert own photos"
  on progress_photos for insert
  with check (client_id = auth.uid());

create policy "coaches can view their clients' photos"
  on progress_photos for select
  using (client_id in (select id from profiles where coach_id = auth.uid()));

-- ============================================================
-- STORAGE BUCKET for progress photos
-- ============================================================
insert into storage.buckets (id, name, public)
values ('progress-photos', 'progress-photos', false)
on conflict (id) do nothing;

-- Clients can upload into their own folder: progress-photos/{their_uid}/...
create policy "clients can upload own photos"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "clients can view own photo files"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coaches can view their clients' photo files
create policy "coaches can view clients' photo files"
  on storage.objects for select
  using (
    bucket_id = 'progress-photos'
    and (storage.foldername(name))[1] in (
      select id::text from profiles where coach_id = auth.uid()
    )
  );

-- ============================================================
-- DONE.
-- Next: create your coach account in Authentication → Users,
-- then run the snippet at the bottom of README.md to promote
-- that account to role='coach'.
-- ============================================================
