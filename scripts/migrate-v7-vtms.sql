-- Virtual Training Management System (v7)
-- Additive only. Safe to run more than once.
-- Does not drop tables, delete rows, or rewrite existing records.
-- Run in Supabase Dashboard → SQL Editor on the existing project.

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
