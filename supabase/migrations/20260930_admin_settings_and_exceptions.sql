create table if not exists public.system_settings (
  id integer primary key check (id = 1),
  resumption_time time not null default '08:00',
  closing_time time not null default '17:00',
  late_threshold_minutes integer not null default 10 check (late_threshold_minutes between 0 and 1440),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.attendance_exceptions (
  id uuid primary key default gen_random_uuid(),
  agent_id uuid not null references public.profiles(id) on delete cascade,
  exception_date date not null,
  note text not null check (length(trim(note)) between 1 and 500),
  granted_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (agent_id, exception_date)
);

alter table public.system_settings enable row level security;
alter table public.attendance_exceptions enable row level security;

grant select on public.system_settings to authenticated;
grant insert, update on public.system_settings to authenticated;
grant select, insert, update on public.attendance_exceptions to authenticated;

create policy "Authenticated users can read system settings"
  on public.system_settings for select to authenticated
  using (true);

create policy "Admins can insert system settings"
  on public.system_settings for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update system settings"
  on public.system_settings for update to authenticated
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

create policy "Agents and admins can read attendance exceptions"
  on public.attendance_exceptions for select to authenticated
  using (
    agent_id = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can insert attendance exceptions"
  on public.attendance_exceptions for insert to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

create policy "Admins can update attendance exceptions"
  on public.attendance_exceptions for update to authenticated
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