-- Campus Guide & Parking System — Full Schema v3
-- Run this entire file in your Supabase SQL Editor

-- =============================================
-- USERS
-- =============================================
create table if not exists public.users (
  id serial primary key,
  username text unique not null,
  password text not null,
  full_name text not null,
  role text not null default 'User' check (role in ('Admin', 'User')),
  created_at timestamptz default now()
);

insert into public.users (username, password, full_name, role) values
  ('admin',   'admin123',   'Admin User',     'Admin'),
  ('student', 'student123', 'Juan dela Cruz', 'User')
on conflict (username) do nothing;

-- =============================================
-- BUILDINGS
-- =============================================
create table if not exists public.buildings (
  id serial primary key,
  name text not null,
  abbreviation text,
  departments text[],
  hours text,
  latitude double precision,
  longitude double precision,
  filter_category text,
  is_open boolean default true
);

insert into public.buildings (name, abbreviation, departments, hours, latitude, longitude, filter_category, is_open) values
  ('RTL Building',         'RTL',  ARRAY['Computer Science','Information Technology'],       '8:00 AM – 5:00 PM', 10.29474, 123.88059, 'Engineering', true),
  ('GLE Building',         'GLE',  ARRAY['Computer Engineering','Electronics Engineering'],  '8:00 AM – 5:00 PM', 10.29526, 123.88125, 'Engineering', true),
  ('Acad Building',        'ACAD', ARRAY['Allied Health','Education'],                       '8:00 AM – 5:00 PM', 10.29576, 123.88109, 'Health',      true),
  ('SAL Building',         'SAL',  ARRAY['Social Sciences','Liberal Arts'],                  '8:00 AM – 5:00 PM', 10.29563, 123.87980, 'Education',   false),
  ('NGE Building',         'NGE',  ARRAY['Nursing','Graduate Education'],                    '8:00 AM – 5:00 PM', 10.29436, 123.88107, 'Health',      true),
  ('ALLIED Building',      'ALY',  ARRAY['Allied Health','Education'],                       '8:00 AM – 5:00 PM', 10.29449, 123.87991, 'Health',      true),
  ('Elementary Building',  'ELEM', ARRAY['Elementary Education'],                            '7:00 AM – 5:00 PM', 10.29646, 123.88039, 'Education',   true),
  ('GLEC Building',        'GLEC', ARRAY['Graduate Education','Continuing Education'],       '8:00 AM – 5:00 PM', 10.29546, 123.88021, 'Education',   false)
on conflict do nothing;

-- =============================================
-- FACILITIES
-- =============================================
create table if not exists public.facilities (
  id serial primary key,
  name text not null,
  emoji text,
  category text,
  services text[],
  hours text,
  latitude double precision,
  longitude double precision,
  is_open boolean default true
);

insert into public.facilities (name, emoji, category, services, hours, latitude, longitude, is_open) values
  ('Canteen',       '🍽️', 'Food',     ARRAY['Food Services','Student Dining'],          '7:00 AM – 7:00 PM', 10.29608, 123.88052, true),
  ('Covered Court', '🏀', 'Sports',   ARRAY['Sports Events','Intramurals'],             '6:00 AM – 10:00 PM',10.29605, 123.88019, true),
  ('GYM',           '💪', 'Sports',   ARRAY['Fitness Center','Weight Training'],        '5:00 AM – 11:00 PM',10.29628, 123.87951, true),
  ('College Library','📚','Academic', ARRAY['Library Services','Research'],             '8:00 AM – 9:00 PM', 10.29524, 123.88083, true),
  ('Espacio',       '☕', 'Leisure',  ARRAY['Student Lounge','Study Area','Café'],      '7:30 AM – 9:00 PM', 10.29563, 123.88070, true)
on conflict do nothing;

-- =============================================
-- PARKING LOTS
-- =============================================
create table if not exists public.parking_lots (
  id serial primary key,
  lot_name text not null,
  departments text,
  hours text,
  latitude double precision,
  longitude double precision,
  rows integer default 3,
  cols integer default 8
);

insert into public.parking_lots (lot_name, departments, hours, latitude, longitude, rows, cols) values
  ('Backgate Parking', 'General',      '6:00 AM – 10:00 PM', 10.29410, 123.88060, 3, 8),
  ('RTL Parking',      'CS, IT Dept.', '7:00 AM – 8:00 PM',  10.29460, 123.88040, 2, 6),
  ('South Lot',        'General',      '6:00 AM – 10:00 PM', 10.29390, 123.88010, 4, 10),
  ('Espacio Parking',  'General',      '7:00 AM – 9:00 PM',  10.29545, 123.88055, 2, 5)
on conflict do nothing;

-- =============================================
-- PARKING SPOTS (auto-generated from lots)
-- =============================================
create table if not exists public.parking_spots (
  id serial primary key,
  lot_id integer references public.parking_lots(id) on delete cascade,
  spot_code text not null,
  row_num integer,
  col_num integer,
  status text not null default 'Available' check (status in ('Available','Occupied','Reserved')),
  reserved_label text default '',
  updated_at timestamptz default now()
);

-- Generate spots for each lot
do $$
declare
  lot record;
  r integer; c integer;
  code text;
  rand float;
  stat text;
begin
  for lot in select * from public.parking_lots loop
    -- Only insert if no spots exist for this lot yet
    if not exists (select 1 from public.parking_spots where lot_id = lot.id) then
      for r in 0..(lot.rows - 1) loop
        for c in 0..(lot.cols - 1) loop
          code := chr(65 + r) || lpad((c+1)::text, 2, '0');
          rand := random();
          if rand < 0.6 then stat := 'Available';
          elsif rand < 0.85 then stat := 'Occupied';
          else stat := 'Reserved';
          end if;
          insert into public.parking_spots (lot_id, spot_code, row_num, col_num, status, reserved_label)
          values (lot.id, code, r, c, stat, case when stat = 'Reserved' then 'Reserved' else '' end);
        end loop;
      end loop;
    end if;
  end loop;
end $$;

-- =============================================
-- RESERVATION HISTORY
-- =============================================
create table if not exists public.reservation_history (
  id serial primary key,
  spot_id integer references public.parking_spots(id) on delete cascade,
  user_id integer references public.users(id),
  vehicle_type text,
  time_start text,
  time_end text,
  reservation_date date default current_date,
  status text default 'Occupied',
  created_at timestamptz default now()
);

-- Seed some demo history
do $$
declare
  spot_ids integer[];
  user_ids integer[];
  vehicles text[] := ARRAY['Car','Motorcycle','SUV / Van','Truck','Bicycle'];
  i integer;
  rand_spot integer;
  rand_user integer;
  rand_vehicle text;
  rand_date date;
  rand_hour integer;
begin
  select array_agg(id) into spot_ids from public.parking_spots;
  select array_agg(id) into user_ids from public.users;

  if array_length(spot_ids, 1) > 0 and not exists (select 1 from public.reservation_history limit 1) then
    for i in 1..150 loop
      rand_spot    := spot_ids[1 + floor(random() * array_length(spot_ids, 1))::int];
      rand_user    := user_ids[1 + floor(random() * array_length(user_ids, 1))::int];
      rand_vehicle := vehicles[1 + floor(random() * 5)::int];
      rand_date    := current_date - (floor(random() * 90) + 1)::int;
      rand_hour    := 6 + floor(random() * 14)::int;
      insert into public.reservation_history (spot_id, user_id, vehicle_type, time_start, reservation_date, status)
      values (rand_spot, rand_user, rand_vehicle, rand_hour::text || ':00', rand_date, 'Occupied');
    end loop;
  end if;
end $$;

-- =============================================
-- DISABLE RLS & GRANT ACCESS
-- =============================================
alter table public.users                disable row level security;
alter table public.buildings            disable row level security;
alter table public.facilities           disable row level security;
alter table public.parking_lots         disable row level security;
alter table public.parking_spots        disable row level security;
alter table public.reservation_history  disable row level security;

grant select, insert, update, delete on public.users               to anon;
grant select, insert, update, delete on public.buildings           to anon;
grant select, insert, update, delete on public.facilities          to anon;
grant select, insert, update, delete on public.parking_lots        to anon;
grant select, insert, update, delete on public.parking_spots       to anon;
grant select, insert, update, delete on public.reservation_history to anon;
grant usage, select on all sequences in schema public to anon;
