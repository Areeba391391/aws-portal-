-- v8e: add missing profile columns, enforce real Gmail for NEW accounts,
-- and remove automated smoke/dummy rows from earlier QA.
-- Safe to re-run. Does NOT delete real auth users (admin@awssbg.com stays).

-- ---------- schema gaps ----------
alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists avatar_url text;

-- ---------- Gmail policy helper ----------
create or replace function public.is_real_gmail(email text)
returns boolean
language plpgsql
immutable
as $$
declare
  local_part text;
  domain text;
  compact text;
begin
  if email is null then
    return false;
  end if;

  email := lower(trim(email));
  if position('@' in email) = 0 then
    return false;
  end if;

  local_part := split_part(email, '@', 1);
  domain := split_part(email, '@', 2);

  if domain not in ('gmail.com', 'googlemail.com') then
    return false;
  end if;

  if local_part !~ '^[a-z0-9.]+$' then
    return false;
  end if;
  if local_part like '.%' or local_part like '%.' or position('..' in local_part) > 0 then
    return false;
  end if;

  compact := replace(local_part, '.', '');
  if length(compact) < 5 then
    return false;
  end if;

  if compact in (
    'a','b','c','test','testing','dummy','fake','sample','example','user','student',
    'admin','temp','asdf','qwerty','abc','abcd','abcde','aaaa','bbbb','cccc','dddd','smoke'
  ) then
    return false;
  end if;

  if compact ~ '^(.)\1+$' then
    return false;
  end if;

  if compact ~ '^(smoke|test|dummy|fake|temp)[-_.0-9]*' then
    return false;
  end if;

  return true;
end;
$$;

-- ---------- invite trigger (department + Gmail) ----------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_request public.credential_requests%rowtype;
begin
  if not public.is_real_gmail(new.email) then
    raise exception 'Only personal Gmail addresses (@gmail.com) are allowed for new accounts.';
  end if;

  select * into approved_request
  from public.credential_requests
  where lower(email) = lower(new.email)
    and status = 'approved'
  order by reviewed_at desc nulls last, created_at desc
  limit 1;

  if not found then
    raise exception 'This portal is invite-only. Request credentials before creating an account.';
  end if;

  insert into public.profiles (id, full_name, email, role, department)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', approved_request.full_name, split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    approved_request.department_session
  )
  on conflict (id) do nothing;

  update public.credential_requests
  set invited_user_id = new.id,
      updated_at = now()
  where id = approved_request.id
    and invited_user_id is null;

  return new;
end;
$$;

-- Guard credential request inserts (new rows only)
create or replace function public.guard_credential_request_email()
returns trigger
language plpgsql
as $$
begin
  if not public.is_real_gmail(new.email) then
    raise exception 'Only personal Gmail addresses (@gmail.com) are allowed.';
  end if;
  new.email := lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists credential_requests_gmail_guard on public.credential_requests;
create trigger credential_requests_gmail_guard
  before insert or update of email on public.credential_requests
  for each row execute function public.guard_credential_request_email();

-- ---------- cleanup smoke / dummy QA rows ----------
delete from public.task_submissions
where content ilike '%smoke%'
   or feedback ilike '%smoke%';

delete from public.project_submissions
where content ilike '%smoke%'
   or supervisor_feedback ilike '%smoke%';

delete from public.supervisor_activity
where summary ilike '%smoke%';

delete from public.course_tasks
where title ilike 'Smoke task%'
   or description ilike '%smoke%';

delete from public.course_projects
where title ilike 'Smoke project%'
   or description ilike '%smoke%';

delete from public.examinations
where title ilike 'Smoke Exam%';

delete from public.announcements
where title ilike 'Smoke ann%'
   or message ilike '%Smoke announcement%';

delete from public.credential_requests
where email ilike '%@awssbg.test'
   or email ilike 'smoke-%'
   or full_name ilike 'Smoke%'
   or full_name ilike 'Env Probe%';

-- Deactivate placeholder Gmail profiles.
-- SQL Editor runs as postgres (not service_role), so briefly disable the
-- status-change guard trigger for this admin cleanup only.
alter table public.profiles disable trigger guard_profile_update;

update public.profiles
set status = 'Inactive'
where email in (
  'a@gmail.com',
  'aaaa@gmail.com',
  'bbbb@gmail.com',
  'cccc@gmail.com'
)
or (
  email ~* '@gmail\.com$'
  and length(split_part(email, '@', 1)) < 5
);

alter table public.profiles enable trigger guard_profile_update;

-- Rename the placeholder course so the portal shows real content.
update public.courses
set
  title = case when title in ('a', 'A') then 'AWS Cloud Fundamentals' else title end,
  description = case when description in ('a', 'A') then 'Core AWS cloud skills for AWS SBG UET Taxila members.' else description end,
  category = case when category in ('a', 'A') then 'Cloud Computing' else category end,
  instructor = case when instructor in ('a', 'A') then 'AWS SBG Team' else instructor end
where id = '1b448bf4-6b9d-4c61-88e3-7c394ca54b45';
