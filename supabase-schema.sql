-- ====================================================================
-- Budget Book - Supabase Schema (Idempotent / Safe to re-run anytime)
-- Run this entire script in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- ====================================================================

-- 1. Enable UUID generation if not enabled
create extension if not exists "uuid-ossp";

-- 2. Create budget_categories table
create table if not exists public.budget_categories (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  budget numeric not null default 0,
  order_num integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 3. Create budget_spends table
create table if not exists public.budget_spends (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  cat text not null,
  amount numeric not null,
  date text not null,
  note text not null default '',
  created bigint,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- 4. Create budget_config table
create table if not exists public.budget_config (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade primary key,
  period_start text not null,
  period_end text not null,
  income jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- 5. Enable Row Level Security (RLS) on all tables
alter table public.budget_categories enable row level security;
alter table public.budget_spends enable row level security;
alter table public.budget_config enable row level security;

-- 6. Row Level Security Policies for budget_categories
drop policy if exists "Users can select own categories" on public.budget_categories;
create policy "Users can select own categories"
  on public.budget_categories for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own categories" on public.budget_categories;
create policy "Users can insert own categories"
  on public.budget_categories for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own categories" on public.budget_categories;
create policy "Users can update own categories"
  on public.budget_categories for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own categories" on public.budget_categories;
create policy "Users can delete own categories"
  on public.budget_categories for delete
  using (auth.uid() = user_id);

-- 7. Row Level Security Policies for budget_spends
drop policy if exists "Users can select own spends" on public.budget_spends;
create policy "Users can select own spends"
  on public.budget_spends for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own spends" on public.budget_spends;
create policy "Users can insert own spends"
  on public.budget_spends for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own spends" on public.budget_spends;
create policy "Users can update own spends"
  on public.budget_spends for update
  using (auth.uid() = user_id);

drop policy if exists "Users can delete own spends" on public.budget_spends;
create policy "Users can delete own spends"
  on public.budget_spends for delete
  using (auth.uid() = user_id);

-- 8. Row Level Security Policies for budget_config
drop policy if exists "Users can select own config" on public.budget_config;
create policy "Users can select own config"
  on public.budget_config for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own config" on public.budget_config;
create policy "Users can insert own config"
  on public.budget_config for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own config" on public.budget_config;
create policy "Users can update own config"
  on public.budget_config for update
  using (auth.uid() = user_id);
