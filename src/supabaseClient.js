/*
-- Run this in Supabase SQL Editor if tables don't exist yet

create table if not exists profiles (
  id uuid primary key references auth.users(id),
  role text check (role in ('admin','staff','volunteer')) not null,
  full_name text, email text, phone text,
  must_reset_password boolean default false,
  created_at timestamptz default now()
);

create table if not exists sites (
  id uuid primary key default gen_random_uuid(),
  name text not null, depth_label text, category text
);

create table if not exists volunteers (
  profile_id uuid primary key references profiles(id),
  coordinator_id uuid references profiles(id),
  site_preference_id uuid references sites(id),
  interests text[], availability text,
  how_heard text, status text default 'pending',
  hours_logged int default 0,
  volunteer_code text unique,
  emergency_contact text,
  created_at timestamptz default now()
);

create table if not exists opportunities (
  id uuid primary key default gen_random_uuid(),
  title text not null, type text, site_id uuid references sites(id),
  description text, commitment_label text,
  date timestamptz, capacity int,
  created_by_staff_id uuid references profiles(id),
  status text default 'open',
  created_at timestamptz default now()
);

create table if not exists opportunity_signups (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid references opportunities(id),
  volunteer_id uuid references profiles(id),
  signed_up_at timestamptz default now(),
  attended boolean default false,
  unique(opportunity_id, volunteer_id)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  assigned_to_volunteer_id uuid references profiles(id),
  assigned_by_staff_id uuid references profiles(id),
  due_date date, priority text default 'medium',
  status text default 'todo',
  linked_opportunity_id uuid references opportunities(id),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  thread_id text not null,
  sender_id uuid references profiles(id),
  recipient_id uuid references profiles(id),
  body text not null,
  sent_at timestamptz default now(),
  read boolean default false
);

-- Seed the 7 sites
insert into sites (name, depth_label, category) values
  ('Vashi Creek', '5m', 'Creek'),
  ('Palm Beach Road Mangroves', '8m', 'Mangroves'),
  ('Nerul Lake', '6m', 'Lake'),
  ('Parsik Hills', '4m', 'Hills'),
  ('Karave Lake', '5m', 'Lake'),
  ('Kavaratti Dive Center', '30m', 'Dive Center'),
  ('Agatti Dive Center', '35m', 'Dive Center')
on conflict do nothing;

-- Enable realtime for messages
alter publication supabase_realtime add table messages;
*/

import { createClient } from "@supabase/supabase-js";

// =========================================================================
// SUPABASE CONFIGURATION
// Replace the values below with your actual Supabase URL and Anon/Public Key.
// =========================================================================

// --- PASTE YOUR SUPABASE URL HERE ---
export const SUPABASE_URL = "https://ogmdudmlxytnucpbucxk.supabase.co";

// --- PASTE YOUR SUPABASE ANON/PUBLIC KEY HERE ---
export const SUPABASE_PUBLIC_KEY = "sb_publishable_vcBV6IFYyRjTNUaWoWfXFQ_R-gFbQAy";

// Create and export the single Supabase client instance
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLIC_KEY);
