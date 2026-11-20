-- Tiny follow-up for agekgimemnfjpuynseky after v8 + v7.
-- Creates storage buckets (not creatable via anon) and re-applies helper grants.
-- Safe to re-run.

grant execute on function public.exam_is_eligible(uuid, uuid) to authenticated;
grant execute on function public.notify_user(uuid, text, text, text, text) to authenticated;
grant execute on function public.is_course_staff(uuid) to authenticated;
grant execute on function public.is_course_admin(uuid) to authenticated;
grant execute on function public.is_course_supervisor(uuid) to authenticated;
grant execute on function public.is_enrolled(uuid) to authenticated;
grant execute on function public.supervisor_ready(uuid, uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('resources', 'resources', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('submissions', 'submissions', false)
on conflict (id) do nothing;
