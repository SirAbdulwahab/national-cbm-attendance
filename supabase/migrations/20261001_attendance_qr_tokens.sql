create extension if not exists pgcrypto with schema extensions;

create table if not exists public.attendance_qr_tokens (
  valid_date date primary key,
  token_hash text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.attendance_qr_tokens enable row level security;

grant select, insert, update on public.attendance_qr_tokens to authenticated;

drop policy if exists "Admins can read attendance QR tokens" on public.attendance_qr_tokens;
create policy "Admins can read attendance QR tokens"
  on public.attendance_qr_tokens for select to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can insert attendance QR tokens" on public.attendance_qr_tokens;
create policy "Admins can insert attendance QR tokens"
  on public.attendance_qr_tokens for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

drop policy if exists "Admins can update attendance QR tokens" on public.attendance_qr_tokens;
create policy "Admins can update attendance QR tokens"
  on public.attendance_qr_tokens for update to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create or replace function public.punch_in_with_qr(p_qr_token text)
returns table (
  agent_id uuid,
  time_in timestamptz,
  time_out timestamptz,
  qr_verified boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public, extensions
as $$
declare
  current_agent uuid := auth.uid();
  v_valid_date date := (now() at time zone 'UTC')::date;
  day_start timestamptz;
  day_end timestamptz;
begin
  if current_agent is null then
    raise exception 'You must be signed in to punch in.' using errcode = '28000';
  end if;

  if p_qr_token is null or length(trim(p_qr_token)) not between 1 and 128 then
    raise exception 'The QR code is invalid.' using errcode = '28000';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = current_agent and role = 'agent'
  ) then
    raise exception 'Only agent accounts can punch in.' using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.attendance_qr_tokens token
    where token.valid_date = v_valid_date
      and token.token_hash = encode(digest(trim(p_qr_token), 'sha256'), 'hex')
  ) then
    raise exception 'This QR code is invalid, expired, or already rotated.' using errcode = '28000';
  end if;

  day_start := v_valid_date::timestamp at time zone 'UTC';
  day_end := (v_valid_date + 1)::timestamp at time zone 'UTC';

  perform pg_advisory_xact_lock(hashtextextended(current_agent::text || v_valid_date::text, 0));

  if exists (
    select 1 from public.attendance record
    where record.agent_id = current_agent
      and record.time_in >= day_start
      and record.time_in < day_end
  ) then
    raise exception 'Attendance has already been recorded for today.' using errcode = '23505';
  end if;

  return query
    insert into public.attendance as inserted (agent_id, time_in, time_out, qr_verified)
    values (current_agent, now(), null, true)
    returning inserted.agent_id, inserted.time_in, inserted.time_out, inserted.qr_verified;
end;
$$;

revoke all on function public.punch_in_with_qr(text) from public;
grant execute on function public.punch_in_with_qr(text) to authenticated;