/*
-- =============================================
-- RUN IN SUPABASE SQL EDITOR — Final Schema
-- =============================================

-- Hours log: detailed per-activity hours history
create table if not exists hours_log (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid references profiles(id) not null,
  logged_by_staff_id uuid references profiles(id) not null,
  hours numeric(4,1) not null check (hours > 0),
  activity_date date not null,
  description text not null,
  linked_opportunity_id uuid references opportunities(id),
  created_at timestamptz default now()
);
alter table hours_log enable row level security;
create policy "hours_log access" on hours_log for all
  using (
    volunteer_id = auth.uid()
    or logged_by_staff_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  )
  with check (
    logged_by_staff_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin')
  );

-- Volunteer applications: public self-registration interest form
create table if not exists volunteer_applications (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text,
  site_preference text,
  interests text[],
  availability text,
  how_heard text,
  message text,
  status text check (status in ('pending', 'approved', 'declined')) default 'pending',
  reviewed_by uuid references profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz default now()
);
alter table volunteer_applications enable row level security;
create policy "staff and admin see applications" on volunteer_applications for all
  using (exists (select 1 from profiles where id = auth.uid() and role in ('admin','staff')))
  with check (true);
create policy "public can insert applications" on volunteer_applications for insert
  with check (true);

-- Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  type text not null,
  title text not null,
  body text not null,
  read boolean default false,
  link text,
  created_at timestamptz default now()
);
alter table notifications enable row level security;
create policy "own notifications" on notifications for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Join requests
create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references profiles(id) not null,
  to_id uuid references profiles(id) not null,
  type text check (type in ('volunteer_to_staff', 'staff_to_volunteer')) not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  message text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);
alter table join_requests enable row level security;
create policy "join_request access" on join_requests for all
  using (from_id = auth.uid() or to_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (from_id = auth.uid() or to_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Enable realtime on new tables
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table join_requests;
*/

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

-- Join requests: volunteer requests to join a staff's team, or staff invites a volunteer
create table if not exists join_requests (
  id uuid primary key default gen_random_uuid(),
  from_id uuid references profiles(id) not null,        -- who sent the request
  to_id uuid references profiles(id) not null,          -- who receives it
  type text check (type in ('volunteer_to_staff', 'staff_to_volunteer', 'admin_to_staff')) not null,
  status text check (status in ('pending', 'accepted', 'declined')) default 'pending',
  message text,
  created_at timestamptz default now(),
  resolved_at timestamptz
);

-- Admin-to-staff messaging (separate from staff-volunteer threads)
-- Uses the existing messages table with thread_id pattern: 'admin::{adminId}::{staffId}'

-- Notifications table for in-app alerts
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  type text not null,  -- 'join_request', 'request_accepted', 'request_declined', 'new_message', 'task_assigned', 'task_updated'
  title text not null,
  body text not null,
  read boolean default false,
  link text,           -- optional deep link e.g. '/staff#requests'
  created_at timestamptz default now()
);

-- RLS for new tables
alter table join_requests enable row level security;
create policy "join_request access" on join_requests for all
  using (from_id = auth.uid() or to_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin'))
  with check (from_id = auth.uid() or to_id = auth.uid()
    or exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

alter table notifications enable row level security;
create policy "own notifications" on notifications for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Enable realtime
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table join_requests;
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
