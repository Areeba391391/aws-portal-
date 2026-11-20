-- Run in Supabase SQL Editor (required once for physical final assessment tracking)
alter table enrollments add column if not exists final_assessment_passed boolean not null default false;
alter table enrollments add column if not exists final_assessment_passed_at timestamptz;
