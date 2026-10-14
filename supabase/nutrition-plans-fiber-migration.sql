-- Add fiber targets to legacy nutrition plans (client Fuel tab shows fiber
-- instead of the meaningless "total grams" box).
-- Run in Supabase SQL Editor.
alter table public.nutrition_plans
  add column if not exists training_fiber numeric,
  add column if not exists rest_fiber numeric;
