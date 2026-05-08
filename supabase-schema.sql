-- Campus Guide & Parking System — Supabase Schema
-- Run this entire file in your Supabase SQL Editor

-- Users
create table if not exists public.users (
  id serial primary key,
  username text unique not null,
  password text not null,
  full_name text not null,
  role text not null default 'User' check (role in ('Admin', 'User')),
  created_at timestamptz default now()
);

-- Seed demo users
insert into public.users (username, password, full_name, role) values
  ('admin',   'admin123',   'Admin User',     'Admin'),
  ('student', 'student123', 'Juan dela Cruz', 'User')
on conflict (username) do nothing;

-- Parking Lots
create table if not exists public.parking_lots (
  id serial primary key,
  lot_name text not null,
  departments text,
  hours text,
  latitude double precision,
  longitude double precision
);

insert into public.parking_lots (lot_name, departments, hours, latitude, longitude) values
  ('Backgate Parking', 'General',      '6:00 AM – 10:00 PM', 10.29410, 123.88060),
  ('RTL Parking',      'CS, IT Dept.', '7:00 AM – 8:00 PM',  10.29460, 123.88040),
  ('South Lot',        'General',      '6:00 AM – 10:00 PM', 10.29390, 123.88010),
  ('Espacio Parking',  'General',      '7:00 AM – 9:00 PM',  10.29545, 123.88055)
on conflict do nothing;

-- Parking Spots
create table if not exists public.parking_spots (
  id serial primary key,
  lot_id integer references public.parking_lots(id) on delete cascade,
  spot_code text not null,
  row_num integer,
  col_num integer,
  status text not null default 'Available' check (status in ('Available','Occupied','Reserved')),
  reserved_label text default ''
);

-- Reservation History
create table if not exists public.reservation_history (
  id serial primary key,
  spot_id integer references public.parking_spots(id) on delete cascade,
  user_id integer references public.users(id),
  vehicle_type text,
  time_start text,
  time_end text,
  reservation_date date default current_date,
  status text default 'Occupied'
);

-- =============================================
-- IMPORTANT: Disable RLS so the app can read data
-- (For a production app, set up proper RLS policies instead)
-- =============================================
alter table public.users              disable row level security;
alter table public.parking_lots       disable row level security;
alter table public.parking_spots      disable row level security;
alter table public.reservation_history disable row level security;

-- Grant access to anon role (needed for Supabase anon key to work)
grant select, insert, update, delete on public.users               to anon;
grant select, insert, update, delete on public.parking_lots        to anon;
grant select, insert, update, delete on public.parking_spots       to anon;
grant select, insert, update, delete on public.reservation_history to anon;
grant usage, select on all sequences in schema public to anon;
