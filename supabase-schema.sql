-- ============================================================
-- Attendly database schema for Supabase
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. PROFILES TABLE
-- Supabase Auth already stores email/password in auth.users (hidden,
-- managed by Supabase). This table adds the extra info we need: name
-- and role (admin/employee), linked 1-to-1 with auth.users.
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  email text not null,
  role text not null check (role in ('admin', 'employee')) default 'employee',
  created_at timestamptz default now()
);

-- 2. COMPANY SETTINGS TABLE
-- Single row holding office location + geofence radius + work start time.
create table company_settings (
  id int primary key default 1,
  name text not null default 'My Company',
  latitude double precision not null default 28.4595,
  longitude double precision not null default 77.0266,
  radius_meters int not null default 200,
  work_start_time text not null default '09:30',
  constraint single_row check (id = 1)
);

insert into company_settings (id, name, latitude, longitude, radius_meters, work_start_time)
values (1, 'My Company HQ', 28.4595, 77.0266, 200, '09:30');

-- 3. ATTENDANCE TABLE
-- One row per employee per day. photo_url stores the Cloudinary image link.
create table attendance (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) not null,
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  check_in_lat double precision,
  check_in_lng double precision,
  check_in_distance_m double precision,
  photo_url text,
  status text not null default 'present' check (status in ('present', 'late', 'absent')),
  unique (user_id, date)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- This is what keeps employees from seeing each other's data, and
-- stops anyone from editing the database directly except through
-- the rules we define below. Supabase requires this to be turned on
-- explicitly per table.
-- ============================================================

alter table profiles enable row level security;
alter table company_settings enable row level security;
alter table attendance enable row level security;

-- --- PROFILES policies ---

-- Anyone logged in can read their own profile
create policy "Users can view own profile"
  on profiles for select
  using (auth.uid() = id);

-- Admins can read every profile (needed for the admin employee list + dashboard)
create policy "Admins can view all profiles"
  on profiles for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can insert new employee profiles
create policy "Admins can insert profiles"
  on profiles for insert
  with check (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Admins can delete employee profiles
create policy "Admins can delete profiles"
  on profiles for delete
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- --- COMPANY_SETTINGS policies ---

-- Everyone logged in can read company settings (employees need this to
-- calculate their distance from the office)
create policy "Authenticated users can view settings"
  on company_settings for select
  to authenticated
  using (true);

-- Only admins can update settings
create policy "Admins can update settings"
  on company_settings for update
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- --- ATTENDANCE policies ---

-- Employees can view their own attendance records
create policy "Users can view own attendance"
  on attendance for select
  using (auth.uid() = user_id);

-- Admins can view everyone's attendance
create policy "Admins can view all attendance"
  on attendance for select
  using (
    exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Employees can insert their own check-in
create policy "Users can insert own attendance"
  on attendance for insert
  with check (auth.uid() = user_id);

-- Employees can update their own row (for check-out)
create policy "Users can update own attendance"
  on attendance for update
  using (auth.uid() = user_id);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- When an admin creates a new employee via Supabase Auth, this trigger
-- automatically creates the matching profiles row using metadata
-- passed in at signup (name, role).
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Unnamed'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'employee')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
