create table if not exists public.attendance_qr (
  id uuid primary key default gen_random_uuid(),
  qr_code text not null unique check (length(trim(qr_code)) > 0),
  label text not null default '',
  qr_value text not null unique check (length(trim(qr_value)) > 0),
  is_active boolean not null default false,
  activated_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.qr_activation_logs (
  id uuid primary key default gen_random_uuid(),
  qr_id uuid not null references public.attendance_qr(id) on delete cascade,
  qr_code text not null,
  activated_by uuid null references auth.users(id) on delete set null,
  activated_at timestamptz not null default now(),
  note text null
);

alter table public.attendance_qr enable row level security;
alter table public.qr_activation_logs enable row level security;

grant select on public.attendance_qr to authenticated;
grant update on public.attendance_qr to authenticated;
grant insert on public.qr_activation_logs to authenticated;

create policy "Authenticated users can read QR cards"
on public.attendance_qr for select to authenticated
using (true);

create policy "Admins can update QR cards"
on public.attendance_qr for update to authenticated
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

create policy "Admins can insert activation logs"
on public.qr_activation_logs for insert to authenticated
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
);

insert into public.attendance_qr (qr_code, label, qr_value, is_active)
values
  ('QR-001', 'Physical Card 1', 'QR-001', true),
  ('QR-002', 'Physical Card 2', 'QR-002', false),
  ('QR-003', 'Physical Card 3', 'QR-003', false)
on conflict (qr_code) do nothing;
