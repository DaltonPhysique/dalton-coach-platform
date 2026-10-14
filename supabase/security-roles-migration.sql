-- ============================================================
-- Security: lock down coach role assignment
-- Run in Supabase SQL Editor (after schema.sql)
--
-- Closes two holes:
--  1. handle_new_user() trusted the 'role' claim in signup metadata,
--     so anyone calling auth.signUp directly could self-assign 'coach'.
--  2. The "clients can update own profile" policy had no WITH CHECK,
--     so any client could flip their own role to 'coach'.
--
-- After this: every new signup is a 'client'. Only an existing coach
-- can promote someone to coach (the app does this right after creating
-- a coach account). Role changes by non-coaches are rejected.
-- ============================================================

-- 1. Force every new profile to 'client', ignoring metadata role.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, full_name, coach_id, start_weight, goal_weight)
  values (
    new.id,
    'client',
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    (new.raw_user_meta_data->>'coach_id')::uuid,
    (new.raw_user_meta_data->>'start_weight')::numeric,
    (new.raw_user_meta_data->>'goal_weight')::numeric
  );
  return new;
end;
$$ language plpgsql security definer;

-- 2. Block role escalation: only a coach can change someone's role.
create or replace function public.prevent_role_escalation()
returns trigger as $$
declare
  actor_role text;
begin
  if old.role is distinct from new.role then
    select role into actor_role from public.profiles where id = auth.uid();
    if actor_role is distinct from 'coach' then
      raise exception 'Only a coach can change user roles.';
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_prevent_role_escalation on public.profiles;
create trigger trg_prevent_role_escalation
  before update on public.profiles
  for each row execute procedure public.prevent_role_escalation();

-- 3. Let coaches update profiles (needed to promote a new coach account).
--    The trigger above still guards the role column itself.
drop policy if exists "coaches can update profiles" on public.profiles;
create policy "coaches can update profiles"
  on public.profiles for update
  using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  )
  with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'coach')
  );
