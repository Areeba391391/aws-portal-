-- Sync script for Supabase project agekgimemnfjpuynseky
-- Makes that database match what the AWS SBG portal expects.
-- Additive only. Safe to re-run. Does not delete existing data.
-- Run in: Supabase Dashboard → SQL Editor (project agekgimemnfjpuynseky)

create extension if not exists "uuid-ossp";

-- ---------- helpers used by RLS (create if missing) ----------
create or replace function public.is_staff()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role in ('team', 'admin')
  );
$$ language sql security definer stable set search_path = public;

create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable set search_path = public;

-- ---------- site_settings (v3 fields used by the app) ----------
alter table site_settings add column if not exists platform_name text default 'AWS SBG UET Taxila';
alter table site_settings add column if not exists university_name text default 'UET Taxila';
alter table site_settings add column if not exists maintenance_mode boolean not null default false;
alter table site_settings add column if not exists allow_registrations boolean not null default false;

-- ---------- enrollments (v5 final assessment) ----------
alter table enrollments add column if not exists final_assessment_passed boolean not null default false;
alter table enrollments add column if not exists final_assessment_passed_at timestamptz;
alter table enrollments add column if not exists completed_lesson_ids text[] not null default '{}';
alter table enrollments add column if not exists quiz_results jsonb not null default '{}'::jsonb;
alter table enrollments add column if not exists certificate_issued boolean not null default false;
alter table enrollments add column if not exists certificate_issued_at timestamptz;
alter table enrollments add column if not exists certificate_number text;

-- ---------- events (v3/v6 fields) ----------
alter table events add column if not exists venue text;
alter table events add column if not exists max_participants int;
alter table events add column if not exists registration_open boolean not null default true;
alter table events add column if not exists registration_form jsonb not null default '[]'::jsonb;
alter table events add column if not exists prizes text;
alter table events add column if not exists team_size_max int default 4;
alter table events add column if not exists rules text;
alter table events add column if not exists meeting_link text;
alter table events add column if not exists team_registration boolean not null default false;
alter table events add column if not exists is_cancelled boolean not null default false;

alter table event_registrations add column if not exists form_responses jsonb not null default '{}'::jsonb;
alter table event_registrations add column if not exists team_name text;
alter table event_registrations add column if not exists reminder_sent boolean not null default false;

-- ---------- resources extras ----------
alter table resources add column if not exists display_order int not null default 0;
alter table resources add column if not exists material_category text;
alter table resources add column if not exists description text;
alter table resources add column if not exists thumbnail text;
alter table resources add column if not exists course_id uuid references courses(id) on delete cascade;
alter table resources add column if not exists module_id text;
alter table resources add column if not exists visibility text not null default 'Public';
alter table resources add column if not exists download_allowed boolean not null default true;
alter table resources add column if not exists preview_allowed boolean not null default true;
alter table resources add column if not exists downloads int not null default 0;
alter table resources add column if not exists views int not null default 0;

-- ---------- announcements + course scope ----------
create table if not exists announcements (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  message text not null,
  created_by uuid references profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
alter table announcements add column if not exists course_id uuid references courses(id) on delete cascade;
alter table announcements enable row level security;
grant select, insert, update, delete on announcements to authenticated;
grant select on announcements to anon;

-- ---------- courses VTMS fields (already present on this project; keep idempotent) ----------
alter table courses add column if not exists start_date date;
alter table courses add column if not exists end_date date;
alter table courses add column if not exists learning_objectives text;
alter table courses add column if not exists required_skills text;
alter table courses add column if not exists whatsapp_url text;
alter table courses add column if not exists required_project_count int not null default 2;
alter table courses add column if not exists exam_eligibility jsonb not null default '{}'::jsonb;
alter table courses add column if not exists lifecycle_status text not null default 'active';

-- ---------- credential_requests (required by invite-only auth) ----------
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
create unique index if not exists credential_requests_one_pending_email
  on credential_requests (lower(email))
  where status = 'pending';
create index if not exists credential_requests_status_created_idx
  on credential_requests (status, created_at desc);
create index if not exists credential_requests_email_idx
  on credential_requests (lower(email), created_at desc);
alter table credential_requests enable row level security;
drop policy if exists "Admins read credential requests" on credential_requests;
drop policy if exists "Admins update credential requests" on credential_requests;
create policy "Admins read credential requests"
  on credential_requests for select using (public.is_admin());
create policy "Admins update credential requests"
  on credential_requests for update using (public.is_admin()) with check (public.is_admin());
grant select, update on credential_requests to authenticated;

-- Invite-only profile creation (preserves existing profiles; only gates new sign-ups)
create or replace function public.handle_new_user()
returns trigger as $$
declare
  approved_request credential_requests%rowtype;
begin
  select * into approved_request
  from credential_requests
  where lower(email) = lower(new.email) and status = 'approved'
  order by reviewed_at desc nulls last
  limit 1;

  if approved_request.id is null then
    -- Allow bootstrap if an admin already exists and this email is being invited
    -- through the Admin Users API (approved request should always be present).
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- ensure VTMS tables exist (no-op if already created) ----------
create table if not exists course_staff (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  assignment_role text not null check (assignment_role in ('course_admin', 'supervisor')),
  assigned_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (course_id, user_id, assignment_role)
);

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

create table if not exists examinations (
  id uuid primary key default uuid_generate_v4(),
  course_id uuid not null references courses(id) on delete cascade,
  title text not null default 'Final examination',
  scheduled_at timestamptz,
  instructions text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

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

-- ---------- grants (this project was missing them for anon/authenticated) ----------
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to anon, authenticated;

grant select, insert, update, delete on course_staff to authenticated;
grant select, insert, update, delete on course_tasks to authenticated;
grant select, insert, update, delete on task_submissions to authenticated;
grant select, insert, update, delete on course_projects to authenticated;
grant select, insert, update, delete on project_submissions to authenticated;
grant select, insert, update, delete on supervisor_activity to authenticated;
grant select, insert, update, delete on exam_applications to authenticated;
grant select, insert, update, delete on examinations to authenticated;
grant select, insert, update, delete on exam_results to authenticated;

-- ---------- storage ----------
insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;

-- NOTE: For full VTMS RLS policies, triggers, and exam_is_eligible / notify_user,
-- also run scripts/migrate-v7-vtms.sql after this file. It is idempotent and
-- will fill any remaining policy/function gaps without deleting data.
