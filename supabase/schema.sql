-- =============================================================
-- Paradise Creek Hotel — Supabase Schema + RLS Policies
-- Run this in your Supabase SQL Editor
-- =============================================================

-- 0. EXTENSIONS
create extension if not exists "pgcrypto";

-- =============================================================
-- 1. PROFILES TABLE (extends auth.users)
-- =============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles"
  on public.profiles for select
  using (public.is_admin());

-- Users can update own profile (but cannot change role)
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Users update own profile" on public.profiles;
create policy "Users update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- Admins can update any profile
drop policy if exists "Admins can update profiles" on public.profiles;
drop policy if exists "Admins update profiles" on public.profiles;
create policy "Admins update profiles"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================
-- 2. ROOMS TABLE
-- =============================================================
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  category text not null default 'standard' check (category in ('standard', 'deluxe', 'suite', 'penthouse')),
  price_per_night numeric not null check (price_per_night > 0),
  max_guests integer not null default 2 check (max_guests > 0),
  available_rooms integer not null default 1 check (available_rooms >= 0),
  images text[] default '{}',
  amenities text[] default '{}',
  is_available boolean default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.rooms enable row level security;

drop policy if exists "Anyone can view rooms" on public.rooms;
create policy "Anyone can view rooms"
  on public.rooms for select
  using (true);

drop policy if exists "Only admins can insert rooms" on public.rooms;
create policy "Only admins can insert rooms"
  on public.rooms for insert
  with check (public.is_admin());

drop policy if exists "Only admins can update rooms" on public.rooms;
create policy "Only admins can update rooms"
  on public.rooms for update
  using (public.is_admin());

drop policy if exists "Only admins can delete rooms" on public.rooms;
create policy "Only admins can delete rooms"
  on public.rooms for delete
  using (public.is_admin());

-- =============================================================
-- 3. BOOKINGS TABLE
-- =============================================================
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  room_id uuid not null references public.rooms(id) on delete cascade,
  room_name text,
  user_email text,
  guest_name text,
  guest_email text,
  guest_phone text default '',
  country text default '',
  special_requests text default '',
  booking_reference text not null default '',
  checked_in_at timestamp with time zone,
  checked_out_at timestamp with time zone,
  check_in date not null,
  check_out date not null,
  guests integer not null default 1,
  total_price numeric not null default 0,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  paystack_ref text default '',
  payment_ref text default '',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  paid_at timestamp with time zone,

  -- Prevent inverted dates
  constraint valid_booking_dates check (check_out > check_in),
  -- Guest or user must be identifiable
  constraint booking_has_owner check (user_id is not null or guest_email is not null)
);

-- Add unique index on booking_reference (only for non-empty refs)
create unique index if not exists idx_bookings_booking_reference
  on public.bookings (booking_reference)
  where booking_reference != '';

alter table public.bookings enable row level security;

drop policy if exists "Users can view own bookings" on public.bookings;
create policy "Users can view own bookings"
  on public.bookings for select
  using (auth.uid() = user_id);

drop policy if exists "Guests can view bookings by email" on public.bookings;
create policy "Guests can view bookings by email"
  on public.bookings for select
  using (auth.uid() IS NULL);

-- Direct inserts: authenticated users can create their own bookings,
-- anon users can create guest bookings (no user_id), and admins can create any.
drop policy if exists "Anyone can create bookings" on public.bookings;
drop policy if exists "Users can create own bookings" on public.bookings;
drop policy if exists "Block direct inserts on bookings" on public.bookings;
drop policy if exists "Authenticated users can insert bookings" on public.bookings;
drop policy if exists "Guest users can insert bookings" on public.bookings;
drop policy if exists "Admins can insert bookings" on public.bookings;

create policy "Authenticated users can insert bookings"
  on public.bookings for insert
  with check (auth.uid() = user_id);

create policy "Guest users can insert bookings"
  on public.bookings for insert
  with check (
    auth.uid() is null
    and user_id is null
    and guest_email is not null
    and guest_email != ''
  );

create policy "Admins can insert bookings"
  on public.bookings for insert
  with check (public.is_admin());

drop policy if exists "Admins can view all bookings" on public.bookings;
create policy "Admins can view all bookings"
  on public.bookings for select
  using (public.is_admin());

drop policy if exists "Admins can update bookings" on public.bookings;
create policy "Admins can update bookings"
  on public.bookings for update
  using (public.is_admin());

-- =============================================================
-- 4. BOOKING CONFLICT PREVENTION (RPC)
-- Prevents double-booking by checking overlapping dates
-- Supports both authenticated users and guest bookings
-- =============================================================
create or replace function public.create_booking_safe(
  p_room_id uuid,
  p_room_name text,
  p_guest_name text,
  p_guest_email text default '',
  p_guest_phone text default '',
  p_country text default '',
  p_special_requests text default '',
  p_booking_reference text default '',
  p_check_in date,
  p_check_out date,
  p_guests integer default 1,
  p_total_price numeric default 0,
  p_status text default 'pending',
  p_paystack_ref text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
  v_room_available integer;
  v_conflicting_bookings integer;
  v_booking_id uuid;
  v_ref text;
  v_result jsonb;
begin
  -- Use the authenticated user's ID (null for guest bookings)
  v_user_id := auth.uid();

  -- Generate booking reference if not provided
  v_ref := p_booking_reference;
  if v_ref = '' then
    v_ref := 'HTL-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 9000 + 1000)::text, 4, '0');
  end if;

  -- Check the room has available inventory
  select available_rooms into v_room_available
  from public.rooms
  where id = p_room_id
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Room not found');
  end if;

  -- Count overlapping non-cancelled bookings
  select count(*) into v_conflicting_bookings
  from public.bookings
  where room_id = p_room_id
    and status not in ('cancelled', 'checked_out')
    and p_check_in < check_out
    and p_check_out > check_in;

  if v_conflicting_bookings >= v_room_available then
    return jsonb_build_object('success', false, 'error', 'Room is not available for selected dates');
  end if;

  -- Create the booking (user_id is null for guest bookings)
  insert into public.bookings (
    user_id, room_id, room_name, guest_name, guest_email, guest_phone,
    country, special_requests, booking_reference,
    check_in, check_out, guests, total_price, status, paystack_ref
  ) values (
    v_user_id, p_room_id, p_room_name, p_guest_name, p_guest_email, p_guest_phone,
    p_country, p_special_requests, v_ref,
    p_check_in, p_check_out, p_guests, p_total_price, p_status, p_paystack_ref
  )
  returning id into v_booking_id;

  v_result := jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_reference', v_ref,
    'status', p_status
  );

  return v_result;
end;
$$;

-- Allow anon and authenticated roles to call this function via REST API
grant execute on function public.create_booking_safe to anon, authenticated;

-- Allow client-side role-checking functions
grant execute on function public.get_my_role to anon, authenticated;
grant execute on function public.is_admin to anon, authenticated;

-- =============================================================
-- 5. UPDATED_AT TRIGGER (auto-update on all tables)
-- =============================================================
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at_profiles on public.profiles;
create trigger set_updated_at_profiles
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_rooms on public.rooms;
create trigger set_updated_at_rooms
  before update on public.rooms
  for each row execute function public.update_updated_at_column();

drop trigger if exists set_updated_at_bookings on public.bookings;
create trigger set_updated_at_bookings
  before update on public.bookings
  for each row execute function public.update_updated_at_column();

-- =============================================================
-- 6. CONTACTS TABLE
-- =============================================================
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

alter table public.contacts enable row level security;

drop policy if exists "Anyone can submit contact" on public.contacts;
create policy "Anyone can submit contact"
  on public.contacts for insert
  with check (true);

drop policy if exists "Admins can view contacts" on public.contacts;
create policy "Admins can view contacts"
  on public.contacts for select
  using (public.is_admin());

drop policy if exists "Admins can update contacts" on public.contacts;
create policy "Admins can update contacts"
  on public.contacts for update
  using (public.is_admin());

drop trigger if exists set_updated_at_contacts on public.contacts;
create trigger set_updated_at_contacts
  before update on public.contacts
  for each row execute function public.update_updated_at_column();

-- =============================================================
-- 7. STORAGE BUCKETS + POLICIES
-- Create buckets first via Supabase Dashboard or:
--   insert into storage.buckets (id, name, public) values ('rooms', 'rooms', true);
--   insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);
-- =============================================================

-- Room images: anyone can view
drop policy if exists "Public room images" on storage.objects;
create policy "Public room images"
  on storage.objects
  for select
  using (bucket_id = 'rooms');

-- Room images: only admins can upload (JPEG, PNG, WebP only)
drop policy if exists "Admins upload room images" on storage.objects;
create policy "Admins upload room images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'rooms'
    and public.is_admin()
    and (
      lower(right(name, 4)) in ('.jpg', 'png', 'webp')
      or lower(right(name, 5)) = '.jpeg'
    )
  );

-- Room images: only admins can delete
drop policy if exists "Admins delete room images" on storage.objects;
create policy "Admins delete room images"
  on storage.objects
  for delete
  using (
    bucket_id = 'rooms'
    and public.is_admin()
  );

-- Room images: only admins can update
drop policy if exists "Admins update room images" on storage.objects;
create policy "Admins update room images"
  on storage.objects
  for update
  using (
    bucket_id = 'rooms'
    and public.is_admin()
  )
  with check (
    bucket_id = 'rooms'
    and public.is_admin()
    and (
      lower(right(name, 4)) in ('.jpg', 'png', 'webp')
      or lower(right(name, 5)) = '.jpeg'
    )
  );

-- Room images: admins can list/view all room storage objects
drop policy if exists "Admins view room image metadata" on storage.objects;
create policy "Admins view room image metadata"
  on storage.objects
  for select
  using (
    bucket_id = 'rooms'
    and public.is_admin()
  );

-- Avatars: anyone can view
drop policy if exists "Public avatars" on storage.objects;
create policy "Public avatars"
  on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Avatars: authenticated users can upload own avatar
drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar"
  on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Avatars: authenticated users can update own avatar
drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- =============================================================
-- 8. INDEXES (for dashboard performance)
-- =============================================================
create index if not exists idx_bookings_user_id
  on public.bookings (user_id);

create index if not exists idx_bookings_room_id
  on public.bookings (room_id);

create index if not exists idx_bookings_status
  on public.bookings (status);

create index if not exists idx_rooms_category
  on public.rooms (category);

create index if not exists idx_profiles_role
  on public.profiles (role);

create index if not exists idx_bookings_dates
  on public.bookings (check_in, check_out);

-- =============================================================
-- 8b. BOOKING NOTIFICATION TRIGGER
-- Sends email to admin when a new booking is created.
-- Uses pg_net extension to call the notify-booking Edge Function.
-- =============================================================
-- Requires: supabase/functions/notify-booking deployed with --no-verify-jwt
-- + RESEND_API_KEY + ADMIN_EMAIL secrets set
-- Enable pg_net if not already:
--   create extension if not exists net with schema extensions;
--
create or replace function public.notify_admin_on_booking()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Wrap in exception block so a pg_net failure doesn't kill the booking
  begin
    perform
      net.http_post(
        url := 'https://nonteozyfshjeotbntpa.supabase.co/functions/v1/notify-booking',
        headers := jsonb_build_object('Content-Type', 'application/json'),
        body := jsonb_build_object('record', row_to_json(new)::jsonb)
      );
  exception when others then
    -- Log and swallow — booking insert must not fail over notification
    raise warning 'notify_admin_on_booking failed: %', SQLERRM;
  end;
  return new;
end;
$$;

-- Protect the role column: users cannot self-promote to admin
-- Only admin-managed functions or direct DB updates should set role
revoke update(role) on public.profiles from authenticated;

-- =============================================================
-- 9. GET MY ROLE FUNCTION (bypasses RLS)
-- Creates a security definer function so the client can reliably
-- fetch the user's role without being blocked by RLS policies.
-- =============================================================
create or replace function public.get_my_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- =============================================================
-- 9b. IS ADMIN FUNCTION (cleaner helper for RLS policies)
-- Returns true if the authenticated user has admin role.
-- Security definer bypasses RLS to avoid infinite recursion.
-- =============================================================
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
    and role = 'admin'
  );
$$;

-- =============================================================
-- 10. MIGRATION (run this if you already created the bookings table with the old schema)
-- Adds guest-booking columns and makes user_id nullable
-- =============================================================
-- alter table public.bookings
--   alter column user_id drop not null,
--   add column if not exists guest_email text,
--   add column if not exists guest_phone text default '',
--   add column if not exists country text default '',
--   add column if not exists special_requests text default '',
--   add column if not exists booking_reference text not null default '',
--   add column if not exists checked_in_at timestamp with time zone,
-- add column if not exists checked_out_at timestamp with time zone;
-- alter table public.bookings add constraint booking_has_owner check (user_id is not null or guest_email is not null);
-- create unique index if not exists idx_bookings_booking_reference on public.bookings (booking_reference) where booking_reference != '';
--
-- =============================================================
-- 11. ADMIN CREATION
-- After signing up, run this to make yourself admin:
--   update public.profiles
--   set role = 'admin'
--   where email = 'abdulraufabdulhakim71@gmail.com';
-- =============================================================

-- =============================================================
-- 9c. HOTEL SETTINGS TABLE (for admin-managed chatbot info)
-- Single-row table storing hotel details that the chatbot reads dynamically.
-- =============================================================
create table if not exists public.hotel_settings (
  id integer primary key default 1 check (id = 1),  -- enforce single row
  hotel_name text not null default 'Paradise Creek Hotel',
  tagline text default 'Where Luxury Meets Serenity',
  location text default 'Independence Ave, Accra, Ghana',
  airport_distance text default '15 minutes from Kotoka International Airport',
  phone text default '+233 30 277 1234',
  email text default 'paradisecreekhotel@yahoo.com',
  check_in_time text default '3:00 PM',
  check_out_time text default '11:00 AM',
  parking_info text default 'Complimentary valet parking available',
  wifi_info text default 'Complimentary high-speed WiFi throughout the hotel',
  restaurant_hours text default 'Breakfast 7-10AM, Lunch 12-3PM, Dinner 6-10PM',
  room_service text default 'Available 24/7',
  since_year text default '1999',
  description text default 'A sanctuary where nature meets luxury — a legacy of excellence.',
  amenities text[] default array[
    'Infinity Pool', 'Fine Dining Restaurant', 'Spa & Wellness Center',
    'Private Beach Access', 'Fitness Center', '24/7 Concierge', 'Farm-to-table cuisine'
  ],
  social_facebook text default 'https://www.facebook.com/ParadiseCreekHotel',
  social_instagram text default '@paradisecreekg',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Auto-insert the default row if missing
insert into public.hotel_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.hotel_settings enable row level security;

-- Anyone can read hotel settings (public info)
drop policy if exists "Anyone can view hotel settings" on public.hotel_settings;
create policy "Anyone can view hotel settings"
  on public.hotel_settings for select
  using (true);

-- Only admins can update hotel settings
drop policy if exists "Admins can update hotel settings" on public.hotel_settings;
create policy "Admins can update hotel settings"
  on public.hotel_settings for update
  using (public.is_admin())
  with check (public.is_admin());

-- =============================================================
-- 10. SEED DATA (optional — run after tables exist)
-- =============================================================
-- insert into public.rooms (title, description, category, price_per_night, max_guests, available_rooms, images, amenities, is_available) values
--   ('Royal Deluxe Suite', 'A magnificent suite featuring panoramic city views, king-sized canopy bed, separate living area with Italian marble floors, and a private balcony. The en-suite bathroom includes a deep soaking tub and rain shower.', 'suite', 1200, 3, 2, '{https://picsum.photos/seed/royal1/800/500,https://picsum.photos/seed/royal2/800/500,https://picsum.photos/seed/royal3/800/500}', '{King Bed,City View,Mini Bar,Wi-Fi,Smart TV,Room Service,Jacuzzi,Balcony}', true),
--   ('Ocean Breeze Deluxe', 'Wake up to stunning ocean views in this elegantly appointed deluxe room. Features a plush queen bed, modern workspace, and a spa-inspired bathroom with premium amenities.', 'deluxe', 750, 2, 3, '{https://picsum.photos/seed/ocean1/800/500,https://picsum.photos/seed/ocean2/800/500,https://picsum.photos/seed/ocean3/800/500}', '{Queen Bed,Ocean View,Mini Bar,Wi-Fi,TV,Coffee Maker}', true),
--   ('Garden View Standard', 'A comfortable and stylish room overlooking our lush tropical gardens. Perfect for the discerning traveler seeking quality and value with all essential amenities.', 'standard', 400, 2, 4, '{https://picsum.photos/seed/garden1/800/500,https://picsum.photos/seed/garden2/800/500,https://picsum.photos/seed/garden3/800/500}', '{Double Bed,Garden View,Wi-Fi,TV,Air Conditioning}', true),
--   ('Presidential Penthouse', 'The pinnacle of luxury living. This two-story penthouse spans 200sqm with a private rooftop terrace, personal butler service, gourmet kitchen, and 360-degree views of the coastline.', 'penthouse', 3500, 4, 1, '{https://picsum.photos/seed/pent1/800/500,https://picsum.photos/seed/pent2/800/500,https://picsum.photos/seed/pent3/800/500,https://picsum.photos/seed/pent4/800/500}', '{King Bed,Panoramic View,Private Terrace,Butler,Kitchen,Jacuzzi,Sauna,Wi-Fi}', true),
--   ('Harbor Deluxe Room', 'Watch the boats sail by from this beautifully designed harbor-view room. Features contemporary African art, premium bedding, and a spacious marble bathroom.', 'deluxe', 850, 2, 2, '{https://picsum.photos/seed/harbor1/800/500,https://picsum.photos/seed/harbor2/800/500}', '{King Bed,Harbor View,Mini Bar,Wi-Fi,Smart TV,Bathrobe}', true),
--   ('Classic Comfort Room', 'Our classic room combines traditional elegance with modern convenience. Thoughtfully designed with warm tones and authentic local craftsmanship throughout.', 'standard', 350, 2, 1, '{https://picsum.photos/seed/classic1/800/500,https://picsum.photos/seed/classic2/800/500}', '{Double Bed,Wi-Fi,TV,Air Conditioning,Desk}', false);
