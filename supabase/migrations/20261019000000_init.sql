-- Parity schema. All money columns are integer centavos.
-- Row Level Security is ON for every table with NO policies: the public (anon) key can't read
-- or write anything. Only the server, using the service-role key behind server/access.ts, touches data.

create extension if not exists pgcrypto;

-- Groups -------------------------------------------------------------------------------------
create table public.groups (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  name text not null check (char_length(name) between 1 and 80),
  currency text not null default 'PHP' check (char_length(currency) = 3),
  kind text not null default 'group' check (kind in ('group', 'quick')),
  organizer_key_hash text not null,
  locked boolean not null default false,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 40),
  status text not null default 'active' check (status in ('active', 'pending', 'removed')),
  device_id text,
  default_share numeric(6, 2) not null default 1 check (default_share > 0),
  gcash text check (gcash is null or gcash ~ '^[0-9 +-]{7,20}$'),
  maya text check (maya is null or maya ~ '^[0-9 +-]{7,20}$'),
  pay_qr_path text,
  first_seen_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index participants_group_name on public.participants (group_id, lower(name))
  where status <> 'removed';
create index participants_device on public.participants (group_id, device_id);

-- Scanned bills --------------------------------------------------------------------------------
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  token text not null unique,
  title text not null check (char_length(title) between 1 and 80),
  merchant text,
  receipt_date date,
  payer_id uuid not null references public.participants (id),
  created_by uuid references public.participants (id),
  status text not null default 'claiming' check (status in ('claiming', 'finalized', 'paid')),
  receipt_total integer check (receipt_total is null or receipt_total >= 0),
  image_paths text[] not null default '{}',
  claim_deadline timestamptz,
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  paid_at timestamptz
);
create index bills_group on public.bills (group_id);

create table public.bill_items (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  position integer not null,
  name text not null check (char_length(name) between 1 and 80),
  qty integer not null default 1 check (qty between 1 and 99),
  total integer not null check (total >= 0),
  shared_by_all boolean not null default false,
  source_part integer not null default 0
);
create index bill_items_bill on public.bill_items (bill_id, position);

create table public.bill_adjustments (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills (id) on delete cascade,
  label text not null,
  amount integer not null -- positive = charge, negative = discount for everyone
);

create table public.personal_discounts (
  bill_id uuid not null references public.bills (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  label text not null default 'Senior/PWD',
  amount integer not null check (amount > 0),
  primary key (bill_id, participant_id)
);

create table public.item_claims (
  item_id uuid not null references public.bill_items (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  qty integer not null default 1 check (qty between 1 and 99),
  created_at timestamptz not null default now(),
  primary key (item_id, participant_id)
);

-- Who is on a bill and how far they are: opened, claiming, done.
create table public.bill_members (
  bill_id uuid not null references public.bills (id) on delete cascade,
  participant_id uuid not null references public.participants (id) on delete cascade,
  opened_at timestamptz,
  done_at timestamptz,
  primary key (bill_id, participant_id)
);

-- Ledger ---------------------------------------------------------------------------------------
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  bill_id uuid references public.bills (id) on delete set null,
  from_id uuid not null references public.participants (id),
  to_id uuid not null references public.participants (id),
  amount integer not null check (amount > 0),
  method text not null check (method in ('gcash', 'maya', 'bank', 'cash', 'other')),
  reference text,
  note text,
  proof_path text,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'rejected')),
  reject_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references public.participants (id),
  check (from_id <> to_id)
);
create index payments_group on public.payments (group_id, status);

create table public.entries (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  kind text not null check (kind in ('expense', 'transfer', 'income')),
  title text not null check (char_length(title) between 1 and 80),
  amount integer not null check (amount > 0),
  payer_id uuid not null references public.participants (id),
  recipient_id uuid references public.participants (id),
  split_mode text not null default 'equal' check (split_mode in ('equal', 'shares', 'percent', 'fixed')),
  category text,
  entry_date date not null default current_date,
  bill_id uuid references public.bills (id) on delete set null,
  payment_id uuid references public.payments (id) on delete set null,
  created_by uuid references public.participants (id),
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check ((kind = 'transfer') = (recipient_id is not null))
);
create index entries_group on public.entries (group_id, entry_date desc) where deleted_at is null;

create table public.entry_splits (
  entry_id uuid not null references public.entries (id) on delete cascade,
  participant_id uuid not null references public.participants (id),
  amount integer not null check (amount >= 0),
  weight numeric(8, 3),
  primary key (entry_id, participant_id)
);

create table public.activity (
  id bigserial primary key,
  group_id uuid not null references public.groups (id) on delete cascade,
  actor_id uuid references public.participants (id) on delete set null,
  action text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index activity_group on public.activity (group_id, created_at desc);

-- Rate limiting (no paid service needed) --------------------------------------------------------
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer, p_max integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into rate_limits (key, window_start, hits) values (p_key, v_window, 1)
  on conflict (key, window_start) do update set hits = rate_limits.hits + 1
  returning hits into v_hits;
  delete from rate_limits where window_start < now() - interval '2 days';
  return v_hits <= p_max;
end;
$$;

-- Housekeeping ---------------------------------------------------------------------------------
create or replace function public.touch_group(p_group uuid)
returns void language sql security definer set search_path = public as $$
  update groups set last_activity_at = now() where id = p_group;
$$;

-- Deletes Groups idle longer than the given interval (see the open question in the spec).
create or replace function public.delete_idle_groups(p_idle interval default interval '2 years')
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  delete from groups where last_activity_at < now() - p_idle;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Lock everything down -------------------------------------------------------------------------
alter table public.groups enable row level security;
alter table public.participants enable row level security;
alter table public.bills enable row level security;
alter table public.bill_items enable row level security;
alter table public.bill_adjustments enable row level security;
alter table public.personal_discounts enable row level security;
alter table public.item_claims enable row level security;
alter table public.bill_members enable row level security;
alter table public.payments enable row level security;
alter table public.entries enable row level security;
alter table public.entry_splits enable row level security;
alter table public.activity enable row level security;
alter table public.rate_limits enable row level security;

revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke execute on function public.touch_group(uuid) from public, anon, authenticated;
revoke execute on function public.delete_idle_groups(interval) from public, anon, authenticated;

-- Private storage buckets (free plan) ------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts', 'receipts', false, 1048576, array['image/jpeg', 'image/webp', 'image/png']),
  ('proofs', 'proofs', false, 524288, array['image/jpeg', 'image/webp', 'image/png']),
  ('payqr', 'payqr', false, 524288, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do nothing;
