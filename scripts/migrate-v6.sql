-- Run once in the Supabase SQL Editor (Dashboard -> SQL Editor -> New query).
-- v6: meeting links, cancellation state, and team-based registration for events.

alter table events add column if not exists meeting_link text;
alter table events add column if not exists team_registration boolean not null default false;
alter table events add column if not exists is_cancelled boolean not null default false;

-- Applicants poll their own request status by email through a server route,
-- so no extra policy is needed here; this index keeps that lookup cheap.
create index if not exists credential_requests_email_idx
  on credential_requests (lower(email), created_at desc);
