-- ============================================================
-- AWS Student Builders Group Portal — Supabase Schema (v2)
-- Run this inside: Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Safe to re-run: every statement is idempotent (IF NOT EXISTS / OR REPLACE),
-- so running this on a project that already has the old v1 schema just
-- fills in whatever is missing instead of erroring out.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;

-- ---------- PROFILES (extends Supabase auth.users) ----------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null default 'student' check (role in ('student', 'team', 'admin')),
  department text,
  avatar_url text,
  status text not null default 'Active' check (status in ('Active', 'Inactive')),
  created_at timestamptz default now()
);
alter table profiles add column if not exists status text not null default 'Active';

-- Auto-create a profile row whenever a new user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- LEARNING PATHS ----------
create table if not exists learning_paths (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  courses int not null default 0,
  created_at timestamptz default now()
);
alter table learning_paths add column if not exists courses int not null default 0;

-- ---------- COURSES (syllabus stored as JSONB: modules -> lessons/quiz) ----------
create table if not exists courses (
  id uuid primary key default uuid_generate_v4(),
  learning_path_id uuid references learning_paths(id) on delete set null,
  title text not null,
  description text,
  level text not null check (level in ('Beginner', 'Intermediate', 'Advanced')),
  modules int default 0,
  icon text default 'Cloud',
  status text not null default 'Draft' check (status in ('Active', 'Draft')),
  thumbnail text,
  category text,
  instructor text,
  duration_hours numeric,
  certificate_enabled boolean default true,
  syllabus jsonb not null default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table courses add column if not exists thumbnail text;
alter table courses add column if not exists category text;
alter table courses add column if not exists instructor text;
alter table courses add column if not exists duration_hours numeric;
alter table courses add column if not exists certificate_enabled boolean default true;
alter table courses add column if not exists syllabus jsonb not null default '[]'::jsonb;

-- ---------- ENROLLMENTS + PROGRESS + CERTIFICATES ----------
create table if not exists enrollments (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid references profiles(id) on delete cascade,
  course_id uuid references courses(id) on delete cascade,
  completed_lesson_ids text[] not null default '{}',
  quiz_results jsonb not null default '{}'::jsonb,
  certificate_issued boolean not null default false,
  certificate_issued_at timestamptz,
  certificate_number text,
  enrolled_at timestamptz default now(),
  unique (student_id, course_id)
);
alter table enrollments add column if not exists completed_lesson_ids text[] not null default '{}';
alter table enrollments add column if not exists quiz_results jsonb not null default '{}'::jsonb;
alter table enrollments add column if not exists certificate_issued boolean not null default false;
alter table enrollments add column if not exists certificate_issued_at timestamptz;
alter table enrollments add column if not exists certificate_number text;
alter table enrollments add column if not exists final_assessment_passed boolean not null default false;
alter table enrollments add column if not exists final_assessment_passed_at timestamptz;

-- ---------- EVENTS ----------
create table if not exists events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type text not null check (type in ('Workshop', 'Hackathon', 'Bootcamp', 'Seminar')),
  description text,
  event_date timestamptz not null,
  mode text not null check (mode in ('Online', 'Onsite', 'Hybrid')),
  venue text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table if not exists event_registrations (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid references events(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  registered_at timestamptz default now(),
  reminder_sent boolean not null default false,
  unique (event_id, student_id)
);
alter table event_registrations add column if not exists reminder_sent boolean not null default false;

-- ---------- RESOURCES ----------
create table if not exists resources (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  type text not null check (type in ('PDF','DOC','PPT','XLS','Image','Video','Audio','ZIP','Text','Markdown','Link')),
  file_url text,
  size_label text,
  thumbnail text,
  course_id uuid references courses(id) on delete cascade,
  module_id text,
  visibility text not null default 'Public' check (visibility in ('Enrolled Students', 'Public')),
  download_allowed boolean not null default true,
  preview_allowed boolean not null default true,
  uploaded_by uuid references profiles(id),
  downloads int not null default 0,
  views int not null default 0,
  created_at timestamptz default now()
);
alter table resources add column if not exists description text;
alter table resources add column if not exists thumbnail text;
alter table resources add column if not exists course_id uuid references courses(id) on delete cascade;
alter table resources add column if not exists module_id text;
alter table resources add column if not exists visibility text not null default 'Public';
alter table resources add column if not exists download_allowed boolean not null default true;
alter table resources add column if not exists preview_allowed boolean not null default true;
alter table resources add column if not exists downloads int not null default 0;
alter table resources add column if not exists views int not null default 0;
-- widen the old v1 type check (PDF/Video/Slides/GitHub/Lab) to the full set the app actually uses
alter table resources drop constraint if exists resources_type_check;
alter table resources add constraint resources_type_check
  check (type in ('PDF','DOC','PPT','XLS','Image','Video','Audio','ZIP','Text','Markdown','Link'));

-- ---------- REVIEWS ----------
create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid references courses(id) on delete cascade,
  student_id uuid references profiles(id) on delete cascade,
  user_name text not null,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz default now()
);

-- ---------- NOTIFICATIONS ----------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  message text,
  type text not null default 'system' check (type in ('resource','course','certificate','event','review','system')),
  link text,
  is_read boolean not null default false,
  created_at timestamptz default now()
);
alter table notifications add column if not exists type text not null default 'system';
alter table notifications add column if not exists link text;

-- ---------- SITE SETTINGS (singleton row) ----------
create table if not exists site_settings (
  id boolean primary key default true,
  hero_title text not null default 'Learn AWS Cloud. Build. Innovate.',
  hero_description text not null default 'A community of student builders growing their cloud computing skills.',
  contact_email text default 'hello@awssbg.com',
  contact_phone text default '',
  stat_members text default '0',
  stat_events text default '0',
  stat_certificates text default '0',
  stat_projects text default '0',
  constraint site_settings_singleton check (id)
);
insert into site_settings (id) values (true) on conflict (id) do nothing;

-- ---------- CONTACT MESSAGES (public contact form) ----------
create table if not exists contact_messages (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  email text not null,
  subject text not null,
  message text not null,
  created_at timestamptz default now()
);

-- Drop the old, redundant standalone certificates table from v1 if present —
-- certificates now live directly on the enrollments row (certificate_issued,
-- certificate_issued_at, certificate_number), matching the app's data model.
drop table if exists certificates;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles enable row level security;
alter table courses enable row level security;
alter table learning_paths enable row level security;
alter table enrollments enable row level security;
alter table events enable row level security;
alter table event_registrations enable row level security;
alter table resources enable row level security;
alter table reviews enable row level security;
alter table notifications enable row level security;
alter table site_settings enable row level security;
alter table contact_messages enable row level security;

-- Helper predicates used across policies below (team or admin)
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('team', 'admin')
  );
$$ language sql security definer stable;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Drop-then-recreate every policy so this script is fully re-runnable
drop policy if exists "Public read courses" on courses;
drop policy if exists "Staff manage courses" on courses;
drop policy if exists "Staff update courses" on courses;
drop policy if exists "Staff delete courses" on courses;
create policy "Public read courses" on courses for select using (status = 'Active' or public.is_staff());
create policy "Staff manage courses" on courses for insert with check (public.is_staff());
create policy "Staff update courses" on courses for update using (public.is_staff());
create policy "Staff delete courses" on courses for delete using (public.is_staff());

drop policy if exists "Public read learning paths" on learning_paths;
drop policy if exists "Staff manage learning paths" on learning_paths;
create policy "Public read learning paths" on learning_paths for select using (true);
create policy "Staff manage learning paths" on learning_paths for all using (public.is_staff());

drop policy if exists "Public read events" on events;
drop policy if exists "Staff manage events" on events;
create policy "Public read events" on events for select using (true);
create policy "Staff manage events" on events for all using (public.is_staff());

drop policy if exists "Public read resources" on resources;
drop policy if exists "Staff manage resources" on resources;
create policy "Public read resources" on resources for select using (
  visibility = 'Public' or public.is_staff() or
  exists (select 1 from enrollments where course_id = resources.course_id and student_id = auth.uid())
);
create policy "Staff manage resources" on resources for all using (public.is_staff());

drop policy if exists "Public read reviews" on reviews;
drop policy if exists "Students insert own reviews" on reviews;
drop policy if exists "Students delete own reviews" on reviews;
create policy "Public read reviews" on reviews for select using (true);
create policy "Students insert own reviews" on reviews for insert with check (auth.uid() = student_id);
create policy "Students delete own reviews" on reviews for delete using (auth.uid() = student_id or public.is_staff());

drop policy if exists "Public read site settings" on site_settings;
drop policy if exists "Staff update site settings" on site_settings;
create policy "Public read site settings" on site_settings for select using (true);
create policy "Staff update site settings" on site_settings for update using (public.is_staff());

drop policy if exists "Anyone can submit contact form" on contact_messages;
drop policy if exists "Staff read contact messages" on contact_messages;
create policy "Anyone can submit contact form" on contact_messages for insert with check (true);
create policy "Staff read contact messages" on contact_messages for select using (public.is_staff());

-- Profiles: users see/update their own row; staff can see & manage everyone
drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Users update own profile" on profiles;
create policy "Users read own profile" on profiles for select using (auth.uid() = id or public.is_staff());
create policy "Users update own profile" on profiles for update using (auth.uid() = id or public.is_admin());

-- Enrollments: students manage their own; staff can see/manage all (admin
-- dashboards, unenroll, revoke/reissue certificates)
drop policy if exists "Students read own enrollments" on enrollments;
drop policy if exists "Students insert own enrollments" on enrollments;
drop policy if exists "Students update own enrollments" on enrollments;
drop policy if exists "Staff delete enrollments" on enrollments;
create policy "Students read own enrollments" on enrollments for select using (auth.uid() = student_id or public.is_staff());
create policy "Students insert own enrollments" on enrollments for insert with check (auth.uid() = student_id);
create policy "Students update own enrollments" on enrollments for update using (auth.uid() = student_id or public.is_staff());
create policy "Staff delete enrollments" on enrollments for delete using (public.is_staff());

-- Event registrations: students manage their own; staff can see all
drop policy if exists "Students read own registrations" on event_registrations;
drop policy if exists "Students insert own registrations" on event_registrations;
drop policy if exists "Students delete own registrations" on event_registrations;
create policy "Students read own registrations" on event_registrations for select using (auth.uid() = student_id or public.is_staff());
create policy "Students insert own registrations" on event_registrations for insert with check (auth.uid() = student_id);
create policy "Students delete own registrations" on event_registrations for delete using (auth.uid() = student_id or public.is_staff());

-- Notifications: users see/update only their own; staff (or the cron job,
-- which runs as security definer and bypasses RLS entirely) can insert
drop policy if exists "Users read own notifications" on notifications;
drop policy if exists "Users update own notifications" on notifications;
drop policy if exists "Staff insert notifications" on notifications;
create policy "Users read own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on notifications for update using (auth.uid() = user_id);
create policy "Staff insert notifications" on notifications for insert with check (auth.uid() = user_id or public.is_staff());

-- ============================================================
-- GRANTS
-- RLS policies above are the actual gatekeeper of who-sees-what, but
-- Postgres requires a base privilege grant before RLS is even evaluated.
-- Tables created via the Dashboard's table UI get this automatically;
-- tables created via raw SQL (like this script) do not — without this
-- block, PostgREST rejects every request with 403 regardless of RLS.
-- ============================================================
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

-- ============================================================
-- STORAGE (files uploaded from Dashboard → Resources, and avatars)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public read resource files" on storage.objects;
create policy "Public read resource files" on storage.objects for select using (bucket_id = 'resources');
drop policy if exists "Staff upload resource files" on storage.objects;
create policy "Staff upload resource files" on storage.objects for insert with check (bucket_id = 'resources' and public.is_staff());
drop policy if exists "Staff update resource files" on storage.objects;
create policy "Staff update resource files" on storage.objects for update using (bucket_id = 'resources' and public.is_staff());
drop policy if exists "Staff delete resource files" on storage.objects;
create policy "Staff delete resource files" on storage.objects for delete using (bucket_id = 'resources' and public.is_staff());

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "Users upload own avatar" on storage.objects;
create policy "Users upload own avatar" on storage.objects for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

-- ============================================================
-- DATE-TRIGGERED EVENT REMINDERS — real background job (pg_cron)
-- Runs INSIDE Supabase's Postgres every 15 minutes, independent of whether
-- the site/browser is open. It notifies every registered student once,
-- 24 hours before an event's start time.
-- ============================================================
create or replace function public.send_event_reminders()
returns void as $$
begin
  insert into notifications (user_id, title, message, type, link)
  select
    er.student_id,
    'Reminder: ' || e.title || ' is coming up',
    'Starts ' || to_char(e.event_date, 'FMDay, FMMonth FMDDth at HH12:MI AM') || ' (' || e.mode || ').',
    'event',
    '/dashboard/student/events'
  from event_registrations er
  join events e on e.id = er.event_id
  where er.reminder_sent = false
    and e.event_date > now()
    and e.event_date <= now() + interval '24 hours';

  update event_registrations er
  set reminder_sent = true
  from events e
  where er.event_id = e.id
    and er.reminder_sent = false
    and e.event_date > now()
    and e.event_date <= now() + interval '24 hours';
end;
$$ language plpgsql security definer;

select cron.unschedule('event-reminders') where exists (
  select 1 from cron.job where jobname = 'event-reminders'
);
select cron.schedule('event-reminders', '*/15 * * * *', 'select public.send_event_reminders();');

-- ============================================================
-- v3 UPGRADES — Hackathons, announcements, platform settings, security
-- Safe to re-run on an existing project.
-- ============================================================

-- Extended event fields (hackathon registration forms, capacity, etc.)
alter table events add column if not exists venue text;
alter table events add column if not exists max_participants int;
alter table events add column if not exists registration_open boolean not null default true;
alter table events add column if not exists registration_form jsonb not null default '[]'::jsonb;
alter table events add column if not exists prizes text;
alter table events add column if not exists team_size_max int default 4;
alter table events add column if not exists rules text;

-- Extended event registration (custom form responses for hackathons)
alter table event_registrations add column if not exists form_responses jsonb not null default '{}'::jsonb;
alter table event_registrations add column if not exists team_name text;

-- Team announcements (persisted, broadcast to all students)
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  created_by uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);

-- Platform settings extensions
alter table site_settings add column if not exists platform_name text default 'AWS SBG UET Taxila';
alter table site_settings add column if not exists university_name text default 'UET Taxila';
alter table site_settings add column if not exists maintenance_mode boolean not null default false;
alter table site_settings add column if not exists allow_registrations boolean not null default false;
update site_settings set allow_registrations = false where id = true;

-- Contact form spam protection
alter table contact_messages add column if not exists ip_hash text;

-- RLS for announcements
alter table announcements enable row level security;
drop policy if exists "Anyone read active announcements" on announcements;
drop policy if exists "Staff manage announcements" on announcements;
create policy "Anyone read active announcements" on announcements for select using (is_active = true or public.is_staff());
create policy "Staff manage announcements" on announcements for all using (public.is_staff());

-- Public can see team/admin profiles on About page (no emails exposed)
drop policy if exists "Public read team profiles" on profiles;
create policy "Public read team profiles" on profiles for select using (role in ('team', 'admin'));

-- Students cannot escalate their own role via profile update
drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile" on profiles for update using (
  auth.uid() = id or public.is_admin()
) with check (
  public.is_admin() or (
    auth.uid() = id and role = (select p.role from profiles p where p.id = auth.uid())
  )
);

-- Staff can read all event registrations (for hackathon export)
drop policy if exists "Staff read all registrations" on event_registrations;
create policy "Staff read all registrations" on event_registrations for select using (
  auth.uid() = student_id or public.is_staff()
);

-- Grant announcements table
grant select, insert, update, delete on announcements to authenticated;
grant select on announcements to anon;

-- ============================================================
-- v4 — INVITE-ONLY CREDENTIAL REQUESTS
-- Public visitors submit through a validated server route. Only admins can
-- review requests. Approved users receive a Supabase one-time invite link
-- and choose their own password; passwords are never sent by email.
-- ============================================================
create table if not exists credential_requests (
  id uuid primary key default uuid_generate_v4(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  email text not null check (char_length(email) between 5 and 254),
  department_session text not null check (char_length(department_session) between 2 and 160),
  study_year text not null check (study_year in ('1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  ip_hash text,
  invited_user_id uuid references auth.users(id) on delete set null,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table credential_requests add column if not exists ip_hash text;

create unique index if not exists credential_requests_one_pending_email
  on credential_requests (lower(email))
  where status = 'pending';

create index if not exists credential_requests_status_created_idx
  on credential_requests (status, created_at desc);

alter table credential_requests enable row level security;

drop policy if exists "Admins read credential requests" on credential_requests;
drop policy if exists "Admins update credential requests" on credential_requests;
create policy "Admins read credential requests"
  on credential_requests for select using (public.is_admin());
create policy "Admins update credential requests"
  on credential_requests for update using (public.is_admin()) with check (public.is_admin());

grant select, update on credential_requests to authenticated;

-- Enforce invite-only membership at the database boundary. Calling the
-- public Supabase sign-up endpoint directly cannot create a portal profile.
create or replace function public.handle_new_user()
returns trigger as $$
declare
  approved_request credential_requests%rowtype;
begin
  if lower(new.email) = 'zakwanureed@gmail.com' then
    insert into public.profiles (id, full_name, email, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data->>'full_name', 'Zakwan Mustafa'),
      new.email,
      'admin'
    )
    on conflict (id) do update set role = 'admin', status = 'Active';
    return new;
  end if;

  select * into approved_request
  from credential_requests
  where lower(email) = lower(new.email) and status = 'approved'
  order by reviewed_at desc nulls last
  limit 1;

  if approved_request.id is null then
    raise exception 'This portal is invite-only. Request credentials before creating an account.';
  end if;

  insert into public.profiles (id, full_name, email, role, department)
  values (
    new.id,
    approved_request.full_name,
    new.email,
    'student',
    approved_request.department_session
  )
  on conflict (id) do nothing;

  update credential_requests
  set invited_user_id = new.id, updated_at = now()
  where id = approved_request.id;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

-- ---------- v5: physical final assessment before certificate issue ----------
alter table enrollments add column if not exists final_assessment_passed boolean not null default false;
alter table enrollments add column if not exists final_assessment_passed_at timestamptz;

-- ---------- v6: event meeting links, cancellation, team registration ----------
alter table events add column if not exists meeting_link text;
alter table events add column if not exists team_registration boolean not null default false;
alter table events add column if not exists is_cancelled boolean not null default false;

create index if not exists credential_requests_email_idx
  on credential_requests (lower(email), created_at desc);

-- ---------- v7: virtual training management (same script as scripts/migrate-v7-vtms.sql) ----------

-- Virtual Training Management System (v7)
-- Additive only. Safe to run more than once.
-- Does not drop tables, delete rows, or rewrite existing records.
-- Run in Supabase Dashboard ? SQL Editor on the existing project.

-- ---------- course fields (existing status Active/Draft is unchanged) ----------
alter table courses add column if not exists start_date date;
alter table courses add column if not exists end_date date;
alter table courses add column if not exists learning_objectives text;
alter table courses add column if not exists required_skills text;
alter table courses add column if not exists whatsapp_url text;
alter table courses add column if not exists required_project_count int not null default 2;
alter table courses add column if not exists exam_eligibility jsonb not null default '{}'::jsonb;
alter table courses add column if not exists lifecycle_status text not null default 'active';

alter table courses drop constraint if exists courses_lifecycle_status_check;
alter table courses add constraint courses_lifecycle_status_check
  check (lifecycle_status in ('active', 'completed', 'archived'));

alter table courses drop constraint if exists courses_required_project_count_check;
alter table courses add constraint courses_required_project_count_check
  check (required_project_count between 1 and 6);

alter table courses drop constraint if exists courses_whatsapp_url_check;
alter table courses add constraint courses_whatsapp_url_check
  check (
    whatsapp_url is null
    or whatsapp_url ~ '^https://(chat\.whatsapp\.com|www\.whatsapp\.com)/'
  );

-- ---------- materials stay in resources ----------
alter table resources add column if not exists display_order int not null default 0;
alter table resources add column if not exists material_category text;

-- ---------- announcements (create if older projects never ran the v3 section) ----------
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  created_by uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table announcements enable row level security;
grant select, insert, update, delete on announcements to authenticated;
grant select on announcements to anon;

-- Course-scoped announcements; null course_id stays global
alter table announcements add column if not exists course_id uuid references courses(id) on delete cascade;
create index if not exists announcements_course_id_idx on announcements (course_id);

-- ---------- notification kinds ----------
alter table notifications drop constraint if exists notifications_type_check;
alter table notifications add constraint notifications_type_check
  check (type in (
    'resource', 'course', 'certificate', 'event', 'review', 'system',
    'task', 'project', 'exam', 'announcement'
  ));

-- ---------- staff assignments ----------
create table if not exists course_staff (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  assignment_role text not null check (assignment_role in ('course_admin', 'supervisor')),
  assigned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, user_id, assignment_role)
);
create index if not exists course_staff_course_idx on course_staff (course_id);
create index if not exists course_staff_user_idx on course_staff (user_id);

-- ---------- tasks ----------
create table if not exists course_tasks (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  instructions text,
  deadline timestamptz,
  marks numeric,
  assessment_criteria text,
  submission_requirements text,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_tasks_course_idx on course_tasks (course_id);

create table if not exists task_submissions (
  id uuid primary key default uuid_generate_v4(),
  task_id uuid not null references course_tasks(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  content text,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'reviewed', 'revision_required')),
  feedback text,
  score numeric,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, student_id)
);
create index if not exists task_submissions_student_idx on task_submissions (student_id);

-- ---------- projects ----------
create table if not exists course_projects (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null,
  description text,
  objectives text,
  requirements text,
  deadline timestamptz,
  attachments jsonb not null default '[]'::jsonb,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_projects_course_idx on course_projects (course_id);

create table if not exists project_submissions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references course_projects(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  content text,
  attachments jsonb not null default '[]'::jsonb,
  status text not null default 'not_started' check (status in (
    'not_started', 'in_progress', 'submitted', 'under_review', 'revision_required', 'approved'
  )),
  supervisor_feedback text,
  admin_assessment text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  submitted_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (project_id, student_id)
);
create index if not exists project_submissions_student_idx on project_submissions (student_id);

-- ---------- supervisor accountability ----------
create table if not exists supervisor_activity (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  supervisor_id uuid not null references profiles(id) on delete cascade,
  student_id uuid references profiles(id) on delete set null,
  activity_type text not null check (activity_type in (
    'student_reviewed', 'project_reviewed', 'feedback_submitted', 'task_assessed',
    'progress_report_submitted', 'exam_readiness_confirmed', 'exam_readiness_revoked'
  )),
  summary text not null,
  related_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists supervisor_activity_course_idx on supervisor_activity (course_id, created_at desc);

-- ---------- examinations ----------
create table if not exists exam_applications (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  status text not null default 'applied' check (status in (
    'applied', 'under_review', 'approved', 'rejected', 'scheduled', 'completed', 'passed', 'failed'
  )),
  decision_note text,
  reviewed_by uuid references profiles(id) on delete set null,
  reviewed_at timestamptz,
  scheduled_at timestamptz,
  schedule_note text,
  score numeric,
  result_note text,
  applied_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (course_id, student_id)
);
create index if not exists exam_applications_course_idx on exam_applications (course_id, status);

create table if not exists examinations (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null default 'Final examination',
  scheduled_at timestamptz,
  instructions text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists examinations_course_idx on examinations (course_id);

create table if not exists exam_results (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null unique references exam_applications(id) on delete cascade,
  course_id uuid not null references courses(id) on delete cascade,
  student_id uuid not null references profiles(id) on delete cascade,
  score numeric,
  outcome text not null check (outcome in ('passed', 'failed')),
  note text,
  recorded_by uuid references profiles(id) on delete set null,
  recorded_at timestamptz not null default now()
);

-- ---------- permission helpers ----------
create or replace function public.is_course_staff(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from course_staff
    where course_id = target_course and user_id = auth.uid()
  );
$$;

create or replace function public.is_course_admin(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from course_staff
    where course_id = target_course
      and user_id = auth.uid()
      and assignment_role = 'course_admin'
  );
$$;

create or replace function public.is_course_supervisor(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from course_staff
    where course_id = target_course
      and user_id = auth.uid()
      and assignment_role = 'supervisor'
  );
$$;

create or replace function public.is_enrolled(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from enrollments
    where course_id = target_course and student_id = auth.uid()
  );
$$;

create or replace function public.supervisor_ready(p_course uuid, p_student uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from supervisor_activity confirmed
    where confirmed.course_id = p_course
      and confirmed.student_id = p_student
      and confirmed.activity_type = 'exam_readiness_confirmed'
      and not exists (
        select 1 from supervisor_activity revoked
        where revoked.course_id = p_course
          and revoked.student_id = p_student
          and revoked.activity_type = 'exam_readiness_revoked'
          and revoked.created_at > confirmed.created_at
      )
  );
$$;

create or replace function public.exam_is_eligible(p_course uuid, p_student uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  rules jsonb;
  require_tasks boolean;
  require_projects boolean;
  require_ready boolean;
  required_projects int;
  approved_projects int;
  task_total int;
  task_done int;
begin
  if auth.uid() is distinct from p_student
     and not public.is_admin()
     and not public.is_course_staff(p_course) then
    return false;
  end if;

  if not exists (
    select 1 from enrollments e where e.course_id = p_course and e.student_id = p_student
  ) then
    return false;
  end if;

  select coalesce(c.exam_eligibility, '{}'::jsonb), coalesce(c.required_project_count, 2)
    into rules, required_projects
  from courses c
  where c.id = p_course;

  require_tasks := coalesce(nullif(rules->>'requireTasks', '')::boolean, true);
  require_projects := coalesce(nullif(rules->>'requireProjects', '')::boolean, true);
  require_ready := coalesce(nullif(rules->>'requireSupervisorReady', '')::boolean, true);

  if require_projects then
    select count(*) into approved_projects
    from project_submissions ps
    join course_projects cp on cp.id = ps.project_id
    where cp.course_id = p_course
      and ps.student_id = p_student
      and ps.status = 'approved';
    if approved_projects < required_projects then
      return false;
    end if;
  end if;

  if require_tasks then
    select count(*) into task_total from course_tasks t where t.course_id = p_course;
    select count(*) into task_done
    from course_tasks t
    join task_submissions ts on ts.task_id = t.id and ts.student_id = p_student
    where t.course_id = p_course
      and ts.status in ('submitted', 'under_review', 'reviewed');
    if task_total > 0 and task_done < task_total then
      return false;
    end if;
  end if;

  if require_ready and not public.supervisor_ready(p_course, p_student) then
    return false;
  end if;

  return true;
end;
$$;

-- Students cannot change role or account status. Service role (admin API) and admins can.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role then
    raise exception 'You cannot change your role';
  end if;
  if new.status is distinct from old.status then
    raise exception 'You cannot change your account status';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_update on profiles;
create trigger guard_profile_update
  before update on profiles
  for each row execute procedure public.guard_profile_update();

-- Students keep lesson and quiz progress. Certificate and assessment flags stay staff-controlled.
create or replace function public.guard_enrollment_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() or public.is_course_admin(old.course_id) then
    return new;
  end if;
  if new.student_id is distinct from old.student_id
     or new.course_id is distinct from old.course_id
     or new.certificate_issued is distinct from old.certificate_issued
     or new.certificate_issued_at is distinct from old.certificate_issued_at
     or new.certificate_number is distinct from old.certificate_number
     or new.final_assessment_passed is distinct from old.final_assessment_passed
     or new.final_assessment_passed_at is distinct from old.final_assessment_passed_at
  then
    raise exception 'You cannot change enrolment approval or certificate fields';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_enrollment_update on enrollments;
create trigger guard_enrollment_update
  before update on enrollments
  for each row execute procedure public.guard_enrollment_update();

create or replace function public.guard_task_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course uuid;
begin
  select course_id into v_course from course_tasks where id = new.task_id;
  if auth.role() = 'service_role'
     or public.is_admin()
     or public.is_course_admin(v_course)
     or public.is_course_supervisor(v_course) then
    return new;
  end if;
  if new.student_id is distinct from auth.uid() or not public.is_enrolled(v_course) then
    raise exception 'You can only submit your own enrolled course work';
  end if;
  if tg_op = 'UPDATE' then
    new.score := old.score;
    new.feedback := old.feedback;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.student_id := old.student_id;
    new.task_id := old.task_id;
  else
    new.score := null;
    new.feedback := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  new.status := 'submitted';
  return new;
end;
$$;

drop trigger if exists guard_task_submission on task_submissions;
create trigger guard_task_submission
  before insert or update on task_submissions
  for each row execute procedure public.guard_task_submission();

create or replace function public.guard_project_submission()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course uuid;
begin
  select course_id into v_course from course_projects where id = new.project_id;
  if auth.role() = 'service_role'
     or public.is_admin()
     or public.is_course_admin(v_course)
     or public.is_course_supervisor(v_course) then
    return new;
  end if;
  if new.student_id is distinct from auth.uid() or not public.is_enrolled(v_course) then
    raise exception 'You can only submit your own enrolled course work';
  end if;
  if tg_op = 'UPDATE' then
    new.supervisor_feedback := old.supervisor_feedback;
    new.admin_assessment := old.admin_assessment;
    new.reviewed_by := old.reviewed_by;
    new.reviewed_at := old.reviewed_at;
    new.student_id := old.student_id;
    new.project_id := old.project_id;
  else
    new.supervisor_feedback := null;
    new.admin_assessment := null;
    new.reviewed_by := null;
    new.reviewed_at := null;
  end if;
  if new.status not in ('not_started', 'in_progress', 'submitted') then
    new.status := 'submitted';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_project_submission on project_submissions;
create trigger guard_project_submission
  before insert or update on project_submissions
  for each row execute procedure public.guard_project_submission();

create or replace function public.guard_exam_application()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or public.is_admin() or public.is_course_admin(new.course_id) then
    return new;
  end if;
  if tg_op <> 'INSERT' then
    raise exception 'You cannot change this examination application';
  end if;
  if new.student_id is distinct from auth.uid() then
    raise exception 'You can only apply for yourself';
  end if;
  if not public.exam_is_eligible(new.course_id, new.student_id) then
    raise exception 'You are not eligible for the final examination yet';
  end if;
  new.status := 'applied';
  new.score := null;
  new.reviewed_by := null;
  new.reviewed_at := null;
  new.scheduled_at := null;
  new.decision_note := null;
  new.result_note := null;
  return new;
end;
$$;

drop trigger if exists guard_exam_application on exam_applications;
create trigger guard_exam_application
  before insert or update on exam_applications
  for each row execute procedure public.guard_exam_application();

create or replace function public.notify_user(
  target uuid,
  n_title text,
  n_message text,
  n_type text,
  n_link text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;
  if n_type not in ('resource', 'course', 'certificate', 'event', 'review', 'system', 'task', 'project', 'exam', 'announcement') then
    raise exception 'Unknown notification type';
  end if;
  if not (
    target = auth.uid()
    or public.is_admin()
    or public.is_staff()
    or exists (
      select 1 from course_staff cs
      join enrollments e on e.course_id = cs.course_id and e.student_id = auth.uid()
      where cs.user_id = target
    )
    or exists (
      select 1 from course_staff cs
      join enrollments e on e.course_id = cs.course_id and e.student_id = target
      where cs.user_id = auth.uid()
    )
  ) then
    raise exception 'Not allowed to notify this user';
  end if;
  insert into notifications (user_id, title, message, type, link)
  values (target, n_title, n_message, n_type, n_link);
end;
$$;

-- ---------- row level security ----------
alter table course_staff enable row level security;
alter table course_tasks enable row level security;
alter table task_submissions enable row level security;
alter table course_projects enable row level security;
alter table project_submissions enable row level security;
alter table supervisor_activity enable row level security;
alter table exam_applications enable row level security;
alter table examinations enable row level security;
alter table exam_results enable row level security;

drop policy if exists "Read course staff" on course_staff;
drop policy if exists "Admins assign course staff" on course_staff;
drop policy if exists "Admins update course staff" on course_staff;
drop policy if exists "Admins remove course staff" on course_staff;
create policy "Read course staff" on course_staff for select using (
  public.is_admin()
  or user_id = auth.uid()
  or public.is_course_staff(course_id)
  or public.is_enrolled(course_id)
);
create policy "Admins assign course staff" on course_staff for insert with check (public.is_admin());
create policy "Admins update course staff" on course_staff for update using (public.is_admin());
create policy "Admins remove course staff" on course_staff for delete using (public.is_admin());

drop policy if exists "Read course tasks" on course_tasks;
drop policy if exists "Manage course tasks" on course_tasks;
create policy "Read course tasks" on course_tasks for select using (
  public.is_admin() or public.is_course_staff(course_id) or public.is_enrolled(course_id)
);
create policy "Manage course tasks" on course_tasks for all using (
  public.is_admin() or public.is_course_admin(course_id)
) with check (
  public.is_admin() or public.is_course_admin(course_id)
);

drop policy if exists "Read task submissions" on task_submissions;
drop policy if exists "Students insert own task submissions" on task_submissions;
drop policy if exists "Update task submissions" on task_submissions;
create policy "Read task submissions" on task_submissions for select using (
  student_id = auth.uid()
  or exists (
    select 1 from course_tasks t
    where t.id = task_id and (public.is_admin() or public.is_course_staff(t.course_id))
  )
);
create policy "Students insert own task submissions" on task_submissions for insert with check (
  student_id = auth.uid()
);
create policy "Update task submissions" on task_submissions for update using (
  student_id = auth.uid()
  or exists (
    select 1 from course_tasks t
    where t.id = task_id and (public.is_admin() or public.is_course_staff(t.course_id))
  )
);

drop policy if exists "Read course projects" on course_projects;
drop policy if exists "Manage course projects" on course_projects;
create policy "Read course projects" on course_projects for select using (
  public.is_admin() or public.is_course_staff(course_id) or public.is_enrolled(course_id)
);
create policy "Manage course projects" on course_projects for all using (
  public.is_admin() or public.is_course_admin(course_id)
) with check (
  public.is_admin() or public.is_course_admin(course_id)
);

drop policy if exists "Read project submissions" on project_submissions;
drop policy if exists "Students insert own project submissions" on project_submissions;
drop policy if exists "Update project submissions" on project_submissions;
create policy "Read project submissions" on project_submissions for select using (
  student_id = auth.uid()
  or exists (
    select 1 from course_projects p
    where p.id = project_id and (public.is_admin() or public.is_course_staff(p.course_id))
  )
);
create policy "Students insert own project submissions" on project_submissions for insert with check (
  student_id = auth.uid()
);
create policy "Update project submissions" on project_submissions for update using (
  student_id = auth.uid()
  or exists (
    select 1 from course_projects p
    where p.id = project_id and (public.is_admin() or public.is_course_staff(p.course_id))
  )
);

drop policy if exists "Read supervisor activity" on supervisor_activity;
drop policy if exists "Insert supervisor activity" on supervisor_activity;
create policy "Read supervisor activity" on supervisor_activity for select using (
  public.is_admin()
  or public.is_course_staff(course_id)
  or (student_id = auth.uid() and public.is_enrolled(course_id))
);
create policy "Insert supervisor activity" on supervisor_activity for insert with check (
  supervisor_id = auth.uid()
  and (public.is_admin() or public.is_course_supervisor(course_id) or public.is_course_admin(course_id))
);

drop policy if exists "Read exam applications" on exam_applications;
drop policy if exists "Insert exam applications" on exam_applications;
drop policy if exists "Update exam applications" on exam_applications;
drop policy if exists "Delete exam applications" on exam_applications;
create policy "Read exam applications" on exam_applications for select using (
  student_id = auth.uid() or public.is_admin() or public.is_course_staff(course_id)
);
create policy "Insert exam applications" on exam_applications for insert with check (
  (student_id = auth.uid() and public.is_enrolled(course_id))
  or public.is_admin()
  or public.is_course_admin(course_id)
);
create policy "Update exam applications" on exam_applications for update using (
  public.is_admin() or public.is_course_admin(course_id)
);
create policy "Delete exam applications" on exam_applications for delete using (
  public.is_admin() or public.is_course_admin(course_id)
);

drop policy if exists "Read examinations" on examinations;
drop policy if exists "Manage examinations" on examinations;
create policy "Read examinations" on examinations for select using (
  public.is_admin() or public.is_course_staff(course_id) or public.is_enrolled(course_id)
);
create policy "Manage examinations" on examinations for all using (
  public.is_admin() or public.is_course_admin(course_id)
) with check (
  public.is_admin() or public.is_course_admin(course_id)
);

drop policy if exists "Read exam results" on exam_results;
drop policy if exists "Manage exam results" on exam_results;
create policy "Read exam results" on exam_results for select using (
  student_id = auth.uid() or public.is_admin() or public.is_course_staff(course_id)
);
create policy "Manage exam results" on exam_results for all using (
  public.is_admin() or public.is_course_admin(course_id)
) with check (
  public.is_admin() or public.is_course_admin(course_id)
);

-- Course writes: super admin creates and deletes. Assigned course admins edit their own courses.
-- Select stays public for Active courses and staff-wide for drafts, matching the current catalog.
drop policy if exists "Staff manage courses" on courses;
drop policy if exists "Staff update courses" on courses;
drop policy if exists "Staff delete courses" on courses;
drop policy if exists "Admins create courses" on courses;
drop policy if exists "Admins and course admins update courses" on courses;
drop policy if exists "Admins delete courses" on courses;
create policy "Admins create courses" on courses for insert with check (public.is_admin());
create policy "Admins and course admins update courses" on courses for update using (
  public.is_admin() or public.is_course_admin(id)
);
create policy "Admins delete courses" on courses for delete using (public.is_admin());

-- Enrolment visibility follows the course assignment. Students still insert and update their own progress.
drop policy if exists "Students read own enrollments" on enrollments;
drop policy if exists "Students update own enrollments" on enrollments;
drop policy if exists "Staff delete enrollments" on enrollments;
drop policy if exists "Read enrollments" on enrollments;
drop policy if exists "Update enrollments" on enrollments;
drop policy if exists "Delete enrollments" on enrollments;
create policy "Read enrollments" on enrollments for select using (
  auth.uid() = student_id or public.is_admin() or public.is_course_staff(course_id)
);
create policy "Update enrollments" on enrollments for update using (
  auth.uid() = student_id or public.is_admin() or public.is_course_staff(course_id)
);
create policy "Delete enrollments" on enrollments for delete using (
  public.is_admin() or public.is_course_admin(course_id)
);

-- Global resources stay with the team. Course materials are managed by that course's admin.
drop policy if exists "Staff manage resources" on resources;
drop policy if exists "Insert resources" on resources;
drop policy if exists "Update resources" on resources;
drop policy if exists "Delete resources" on resources;
create policy "Insert resources" on resources for insert with check (
  public.is_admin()
  or (course_id is null and public.is_staff())
  or public.is_course_admin(course_id)
);
create policy "Update resources" on resources for update using (
  public.is_admin()
  or (course_id is null and public.is_staff())
  or public.is_course_admin(course_id)
);
create policy "Delete resources" on resources for delete using (
  public.is_admin()
  or (course_id is null and public.is_staff())
  or public.is_course_admin(course_id)
);

-- Global announcements stay visible. Course announcements are limited to that course.
drop policy if exists "Anyone read active announcements" on announcements;
drop policy if exists "Staff manage announcements" on announcements;
drop policy if exists "Insert announcements" on announcements;
drop policy if exists "Update announcements" on announcements;
drop policy if exists "Delete announcements" on announcements;
create policy "Read announcements" on announcements for select using (
  public.is_staff()
  or (is_active = true and course_id is null)
  or (
    is_active = true
    and course_id is not null
    and (public.is_enrolled(course_id) or public.is_course_staff(course_id) or public.is_admin())
  )
);
create policy "Insert announcements" on announcements for insert with check (
  public.is_admin()
  or (course_id is null and public.is_staff())
  or (course_id is not null and public.is_course_admin(course_id))
);
create policy "Update announcements" on announcements for update using (
  public.is_admin()
  or (course_id is null and public.is_staff())
  or (course_id is not null and public.is_course_admin(course_id))
);
create policy "Delete announcements" on announcements for delete using (
  public.is_admin()
  or (course_id is null and public.is_staff())
  or (course_id is not null and public.is_course_admin(course_id))
);

grant select, insert, update, delete on course_staff to authenticated;
grant select, insert, update, delete on course_tasks to authenticated;
grant select, insert, update, delete on task_submissions to authenticated;
grant select, insert, update, delete on course_projects to authenticated;
grant select, insert, update, delete on project_submissions to authenticated;
grant select, insert, update, delete on supervisor_activity to authenticated;
grant select, insert, update, delete on exam_applications to authenticated;
grant select, insert, update, delete on examinations to authenticated;
grant select, insert, update, delete on exam_results to authenticated;

revoke all on function public.notify_user(uuid, text, text, text, text) from public;
revoke all on function public.exam_is_eligible(uuid, uuid) from public;
grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;
grant execute on function public.exam_is_eligible(uuid, uuid) to authenticated;

-- Private student submission files. Training materials stay in the public resources bucket.
insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

drop policy if exists "Students upload own submissions" on storage.objects;
drop policy if exists "Students read own submissions" on storage.objects;
drop policy if exists "Students update own submissions" on storage.objects;
drop policy if exists "Students delete own submissions" on storage.objects;
drop policy if exists "Staff read course submissions" on storage.objects;

create policy "Students upload own submissions" on storage.objects for insert with check (
  bucket_id = 'submissions'
  and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Students read own submissions" on storage.objects for select using (
  bucket_id = 'submissions'
  and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Students update own submissions" on storage.objects for update using (
  bucket_id = 'submissions'
  and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Students delete own submissions" on storage.objects for delete using (
  bucket_id = 'submissions'
  and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "Staff read course submissions" on storage.objects for select using (
  bucket_id = 'submissions'
  and (
    public.is_admin()
    or (
      (storage.foldername(name))[2] ~ '^[0-9a-fA-F-]{36}$'
      and public.is_course_staff(((storage.foldername(name))[2])::uuid)
    )
  )
);
