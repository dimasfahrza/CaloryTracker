-- =============================================================================
--  CaloryTracker — Supabase schema
--  Run in Supabase SQL editor (or `supabase db push`).
--  All user-owned tables are protected by RLS so a user can only read/write
--  their own rows. The `foods` table is a shared catalog readable by all,
--  writable by admins only (or seed via service role).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------- profiles --------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  sex text check (sex in ('male','female','other')),
  birth_date date,
  height_cm numeric(5,2),
  activity_level text check (activity_level in ('sedentary','light','moderate','active','very_active')) default 'moderate',
  goal text check (goal in ('lose','maintain','gain')) default 'maintain',
  daily_calorie_target int default 2000,
  protein_target_g int default 150,
  carbs_target_g int default 220,
  fat_target_g int default 70,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- foods (shared catalog) ------------------------------------------
create table if not exists public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  brand text,
  serving_size_g numeric(8,2) not null default 100,
  calories numeric(7,2) not null,
  protein_g numeric(6,2) not null default 0,
  carbs_g numeric(6,2) not null default 0,
  fat_g numeric(6,2) not null default 0,
  fiber_g numeric(6,2) default 0,
  is_public boolean default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
create index if not exists foods_name_idx on public.foods (lower(name));
-- For fuzzy search, run `create extension if not exists pg_trgm;` then add:
-- create index foods_name_trgm on public.foods using gin (name gin_trgm_ops);

-- ---------- food_logs -------------------------------------------------------
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  food_id uuid references public.foods(id) on delete set null,
  -- denormalized snapshot so deleting/updating a food doesn't change history
  food_name text not null,
  meal text not null check (meal in ('breakfast','lunch','dinner','snack')),
  servings numeric(6,2) not null default 1,
  calories numeric(7,2) not null,
  protein_g numeric(6,2) not null default 0,
  carbs_g numeric(6,2) not null default 0,
  fat_g numeric(6,2) not null default 0,
  logged_on date not null default current_date,
  logged_at timestamptz not null default now()
);
create index if not exists food_logs_user_day on public.food_logs (user_id, logged_on);

-- ---------- weight_logs -----------------------------------------------------
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  weight_kg numeric(6,2) not null,
  note text,
  logged_on date not null default current_date,
  created_at timestamptz default now(),
  unique (user_id, logged_on)
);
create index if not exists weight_logs_user_day on public.weight_logs (user_id, logged_on desc);

-- ---------- workouts --------------------------------------------------------
create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text check (type in ('strength','cardio','hiit','yoga','sports','other')) default 'strength',
  duration_min int not null default 0,
  calories_burned int default 0,
  notes text,
  performed_on date not null default current_date,
  created_at timestamptz default now()
);
create index if not exists workouts_user_day on public.workouts (user_id, performed_on desc);

create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  workout_id uuid not null references public.workouts(id) on delete cascade,
  exercise text not null,
  reps int,
  weight_kg numeric(6,2),
  duration_sec int,
  position int default 0
);
create index if not exists workout_sets_workout on public.workout_sets (workout_id, position);

-- =============================================================================
-- Row Level Security
-- =============================================================================
alter table public.profiles      enable row level security;
alter table public.foods         enable row level security;
alter table public.food_logs     enable row level security;
alter table public.weight_logs   enable row level security;
alter table public.workouts      enable row level security;
alter table public.workout_sets  enable row level security;

-- profiles: a user may read & update their own profile only.
drop policy if exists "profiles_self_read"  on public.profiles;
drop policy if exists "profiles_self_write" on public.profiles;
create policy "profiles_self_read"  on public.profiles for select using (auth.uid() = id);
create policy "profiles_self_write" on public.profiles for update using (auth.uid() = id);

-- foods: anyone authenticated may read public rows or rows they created. Authenticated users may insert their own foods.
drop policy if exists "foods_read"   on public.foods;
drop policy if exists "foods_insert" on public.foods;
drop policy if exists "foods_update" on public.foods;
create policy "foods_read"   on public.foods for select using (is_public or created_by = auth.uid());
create policy "foods_insert" on public.foods for insert with check (auth.uid() = created_by);
create policy "foods_update" on public.foods for update using (created_by = auth.uid());

-- food_logs / weight_logs / workouts: strictly per-user.
drop policy if exists "food_logs_owner" on public.food_logs;
create policy "food_logs_owner" on public.food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "weight_logs_owner" on public.weight_logs;
create policy "weight_logs_owner" on public.weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workouts_owner" on public.workouts;
create policy "workouts_owner" on public.workouts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workout_sets_owner" on public.workout_sets;
create policy "workout_sets_owner" on public.workout_sets
  for all using (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workouts w where w.id = workout_id and w.user_id = auth.uid())
  );

-- =============================================================================
-- Daily summary view (derived; respects RLS via underlying tables)
-- =============================================================================
create or replace view public.daily_totals as
  select
    user_id,
    logged_on,
    sum(calories)::numeric(8,1) as calories,
    sum(protein_g)::numeric(7,1) as protein_g,
    sum(carbs_g)::numeric(7,1)   as carbs_g,
    sum(fat_g)::numeric(7,1)     as fat_g,
    count(*)                     as entries
  from public.food_logs
  group by user_id, logged_on;

-- =============================================================================
-- Seed data — a tiny food catalog so the search/picker isn't empty.
-- Run as service role (bypasses RLS) or temporarily disable RLS to insert.
-- =============================================================================
insert into public.foods (name, brand, serving_size_g, calories, protein_g, carbs_g, fat_g, fiber_g) values
  ('Chicken breast (cooked)', null, 100, 165, 31, 0, 3.6, 0),
  ('White rice (cooked)', null, 100, 130, 2.7, 28, 0.3, 0.4),
  ('Brown rice (cooked)', null, 100, 112, 2.6, 24, 0.9, 1.8),
  ('Egg (whole, large)', null, 50, 72, 6.3, 0.4, 4.8, 0),
  ('Banana', null, 118, 105, 1.3, 27, 0.4, 3.1),
  ('Apple', null, 182, 95, 0.5, 25, 0.3, 4.4),
  ('Greek yogurt (plain, nonfat)', null, 100, 59, 10, 3.6, 0.4, 0),
  ('Oats (rolled, dry)', null, 40, 150, 5, 27, 3, 4),
  ('Almonds', null, 28, 164, 6, 6.1, 14.2, 3.5),
  ('Salmon (cooked)', null, 100, 208, 22, 0, 13, 0),
  ('Broccoli (cooked)', null, 100, 35, 2.4, 7.2, 0.4, 3.3),
  ('Whole-wheat bread', null, 28, 69, 3.6, 12, 0.9, 1.9),
  ('Peanut butter', null, 32, 188, 8, 7, 16, 1.6),
  ('Olive oil', null, 14, 119, 0, 0, 13.5, 0),
  ('Whey protein scoop', null, 30, 120, 24, 3, 1.5, 0)
on conflict do nothing;
