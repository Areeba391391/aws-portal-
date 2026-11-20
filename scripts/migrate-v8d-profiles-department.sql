-- Profiles on agekgimemnfjpuynseky were missing department (breaks login + invites).
-- Safe to re-run.

alter table public.profiles add column if not exists department text;
alter table public.profiles add column if not exists avatar_url text;

-- Keep invite trigger aligned with schema.sql
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  approved_request public.credential_requests%rowtype;
begin
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
