-- Tonthun financial ledger foundation.
-- All user-owned writes go through revision-aware RPCs; exposed tables are read-only.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  locale text not null default 'th-TH',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_locale_length check (char_length(locale) between 2 and 35)
);

create table public.broker_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  broker_name text not null,
  display_name text not null,
  base_currency text not null,
  cost_method text not null default 'FIFO',
  revision bigint not null default 1,
  data_revision bigint not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broker_accounts_owner_identity unique (id, owner_id),
  constraint broker_accounts_broker_name check (char_length(btrim(broker_name)) between 1 and 120),
  constraint broker_accounts_display_name check (char_length(btrim(display_name)) between 1 and 120),
  constraint broker_accounts_currency check (base_currency ~ '^[A-Z]{3}$'),
  constraint broker_accounts_cost_method check (cost_method in ('FIFO', 'MOVING_AVERAGE')),
  constraint broker_accounts_revision check (revision > 0),
  constraint broker_accounts_data_revision check (data_revision >= 0)
);

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  market text not null,
  symbol text not null,
  name text,
  asset_type text not null default 'STOCK',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_owner_identity unique (id, owner_id),
  constraint assets_market check (char_length(btrim(market)) between 1 and 32),
  constraint assets_symbol check (char_length(btrim(symbol)) between 1 and 32),
  constraint assets_type check (asset_type in ('STOCK', 'ETF')),
  constraint assets_revision check (revision > 0),
  constraint assets_owner_market_symbol unique (owner_id, market, symbol)
);

create table public.trades (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  broker_account_id uuid not null,
  asset_id uuid not null,
  side text not null,
  status text not null default 'DRAFT',
  evidence_status text not null default 'NONE',
  executed_at timestamptz,
  event_sequence bigint generated always as identity,
  quantity numeric(38, 18),
  unit_price numeric(38, 18),
  fee numeric(38, 18),
  fee_status text not null default 'UNKNOWN',
  currency text,
  external_reference text,
  fingerprint text,
  calculation_method text,
  calculation_version integer,
  data_revision bigint not null default 0,
  revision bigint not null default 1,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trades_owner_identity unique (id, owner_id),
  constraint trades_account_owner foreign key (broker_account_id, owner_id)
    references public.broker_accounts(id, owner_id) on delete restrict,
  constraint trades_asset_owner foreign key (asset_id, owner_id)
    references public.assets(id, owner_id) on delete restrict,
  constraint trades_side check (side in ('BUY', 'SELL')),
  constraint trades_status check (status in ('DRAFT', 'NEEDS_REVIEW', 'CONFIRMED', 'CANCELLED')),
  constraint trades_evidence_status check (evidence_status in ('NONE', 'CALCULABLE', 'DOCUMENT_VERIFIED', 'RECONCILED')),
  constraint trades_quantity check (quantity is null or quantity > 0),
  constraint trades_unit_price check (unit_price is null or unit_price >= 0),
  constraint trades_fee check (fee is null or fee >= 0),
  constraint trades_fee_status check (fee_status in ('KNOWN', 'UNKNOWN')),
  constraint trades_fee_consistency check (
    (fee_status = 'KNOWN' and fee is not null) or (fee_status = 'UNKNOWN' and fee is null)
  ),
  constraint trades_currency check (currency is null or currency ~ '^[A-Z]{3}$'),
  constraint trades_confirmed_fields check (
    status <> 'CONFIRMED' or (
      executed_at is not null and quantity is not null and unit_price is not null and
      fee_status = 'KNOWN' and currency is not null
    )
  ),
  constraint trades_cancelled_at check (
    (status = 'CANCELLED' and cancelled_at is not null) or
    (status <> 'CANCELLED' and cancelled_at is null)
  ),
  constraint trades_calculation_method check (
    calculation_method is null or calculation_method in ('FIFO', 'MOVING_AVERAGE')
  ),
  constraint trades_calculation_version check (calculation_version is null or calculation_version > 0),
  constraint trades_revision check (revision > 0),
  constraint trades_data_revision check (data_revision >= 0)
);

create table public.evidence_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  byte_size bigint not null,
  sha256 text,
  status text not null default 'UPLOADED',
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint evidence_owner_identity unique (id, owner_id),
  constraint evidence_trade_owner foreign key (trade_id, owner_id)
    references public.trades(id, owner_id) on delete restrict,
  constraint evidence_storage_path unique (storage_path),
  constraint evidence_byte_size check (byte_size > 0),
  constraint evidence_sha256 check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  constraint evidence_status check (status in ('UPLOADED', 'VERIFIED', 'REJECTED')),
  constraint evidence_revision check (revision > 0)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  entity_revision bigint not null,
  actor_id uuid references auth.users(id) on delete set null,
  snapshot jsonb not null,
  occurred_at timestamptz not null default now(),
  constraint audit_entity_type check (entity_type in ('BROKER_ACCOUNT', 'ASSET', 'TRADE', 'EVIDENCE')),
  constraint audit_action check (action in ('INSERT', 'UPDATE', 'DELETE')),
  constraint audit_revision check (entity_revision > 0)
);

create table private.mutation_requests (
  owner_id uuid not null references auth.users(id) on delete cascade,
  idempotency_key uuid not null,
  entity_type text not null,
  entity_id uuid not null,
  action text not null,
  request_payload jsonb not null,
  completed_revision bigint,
  created_at timestamptz not null default now(),
  primary key (owner_id, idempotency_key)
);

create index broker_accounts_owner_active_idx
  on public.broker_accounts(owner_id, archived_at, updated_at desc);
create index assets_owner_symbol_idx on public.assets(owner_id, symbol, market);
create index trades_owner_order_idx
  on public.trades(owner_id, executed_at desc nulls last, event_sequence desc, id desc);
create index trades_account_order_idx
  on public.trades(owner_id, broker_account_id, executed_at, event_sequence, id)
  where status = 'CONFIRMED';
create index trades_asset_idx on public.trades(owner_id, broker_account_id, asset_id);
create index trades_status_idx on public.trades(owner_id, status, updated_at desc);
create index trades_fingerprint_idx on public.trades(owner_id, broker_account_id, fingerprint)
  where fingerprint is not null and status <> 'CANCELLED';
create unique index trades_external_reference_uidx
  on public.trades(owner_id, broker_account_id, external_reference)
  where external_reference is not null and status <> 'CANCELLED';
create index evidence_trade_idx on public.evidence_files(owner_id, trade_id);
create index audit_owner_entity_idx
  on public.audit_events(owner_id, entity_type, entity_id, occurred_at desc);

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_owner_id uuid := (v_row ->> 'owner_id')::uuid;
  v_revision bigint := coalesce((v_row ->> 'revision')::bigint, 1);
begin
  insert into public.audit_events (
    owner_id, entity_type, entity_id, action, entity_revision, actor_id, snapshot
  ) values (
    v_owner_id,
    case tg_table_name
      when 'broker_accounts' then 'BROKER_ACCOUNT'
      when 'assets' then 'ASSET'
      when 'trades' then 'TRADE'
      when 'evidence_files' then 'EVIDENCE'
    end,
    (v_row ->> 'id')::uuid,
    tg_op,
    v_revision,
    auth.uid(),
    v_row
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
create trigger broker_accounts_touch_updated_at before update on public.broker_accounts
for each row execute function private.touch_updated_at();
create trigger assets_touch_updated_at before update on public.assets
for each row execute function private.touch_updated_at();
create trigger trades_touch_updated_at before update on public.trades
for each row execute function private.touch_updated_at();
create trigger evidence_touch_updated_at before update on public.evidence_files
for each row execute function private.touch_updated_at();

create trigger broker_accounts_audit after insert or update or delete on public.broker_accounts
for each row execute function private.capture_audit_event();
create trigger assets_audit after insert or update or delete on public.assets
for each row execute function private.capture_audit_event();
create trigger trades_audit after insert or update or delete on public.trades
for each row execute function private.capture_audit_event();
create trigger evidence_audit after insert or update or delete on public.evidence_files
for each row execute function private.capture_audit_event();

create trigger auth_user_profile_created
after insert on auth.users
for each row execute function private.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.broker_accounts enable row level security;
alter table public.assets enable row level security;
alter table public.trades enable row level security;
alter table public.evidence_files enable row level security;
alter table public.audit_events enable row level security;
alter table private.mutation_requests enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated
using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy broker_accounts_select_own on public.broker_accounts for select to authenticated
using ((select auth.uid()) = owner_id);
create policy broker_accounts_insert_own on public.broker_accounts for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy broker_accounts_update_own on public.broker_accounts for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy assets_select_own on public.assets for select to authenticated
using ((select auth.uid()) = owner_id);
create policy assets_insert_own on public.assets for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy assets_update_own on public.assets for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy trades_select_own on public.trades for select to authenticated
using ((select auth.uid()) = owner_id);
create policy trades_insert_own on public.trades for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy trades_update_own on public.trades for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy evidence_select_own on public.evidence_files for select to authenticated
using ((select auth.uid()) = owner_id);
create policy evidence_insert_own on public.evidence_files for insert to authenticated
with check ((select auth.uid()) = owner_id);
create policy evidence_update_own on public.evidence_files for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);
create policy audit_select_own on public.audit_events for select to authenticated
using ((select auth.uid()) = owner_id);

revoke all on public.profiles, public.broker_accounts, public.assets, public.trades,
  public.evidence_files, public.audit_events from anon, authenticated;
grant usage on schema public to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.broker_accounts, public.assets, public.trades,
  public.evidence_files, public.audit_events to authenticated;

create or replace function public.save_broker_account(
  p_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_broker_name text,
  p_display_name text,
  p_base_currency text,
  p_cost_method text,
  p_archived boolean default false
)
returns public.broker_accounts
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_current public.broker_accounts;
  v_result public.broker_accounts;
  v_request private.mutation_requests;
  v_payload jsonb;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_id is null or p_idempotency_key is null then
    raise exception 'CLIENT_ID_AND_IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_EXPECTED_REVISION' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object(
    'expected_revision', p_expected_revision, 'broker_name', p_broker_name,
    'display_name', p_display_name, 'base_currency', p_base_currency,
    'cost_method', p_cost_method, 'archived', p_archived
  );
  insert into private.mutation_requests (
    owner_id, idempotency_key, entity_type, entity_id, action, request_payload
  )
  values (v_owner_id, p_idempotency_key, 'BROKER_ACCOUNT', v_id,
    case when p_expected_revision = 0 then 'INSERT' else 'UPDATE' end, v_payload)
  on conflict (owner_id, idempotency_key) do nothing;
  if not found then
    select * into strict v_request from private.mutation_requests
    where owner_id = v_owner_id and idempotency_key = p_idempotency_key;
    if v_request.entity_type <> 'BROKER_ACCOUNT' or v_request.entity_id <> v_id
      or v_request.request_payload <> v_payload then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
    select * into strict v_result from public.broker_accounts where id = v_id and owner_id = v_owner_id;
    return v_result;
  end if;

  if p_expected_revision = 0 then
    insert into public.broker_accounts (
      id, owner_id, broker_name, display_name, base_currency, cost_method, archived_at
    ) values (
      v_id, v_owner_id, btrim(p_broker_name), btrim(p_display_name), upper(p_base_currency),
      p_cost_method, case when p_archived then now() else null end
    ) returning * into v_result;
  else
    select * into v_current from public.broker_accounts
    where id = v_id and owner_id = v_owner_id for update;
    if not found then raise exception 'BROKER_ACCOUNT_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_current.revision <> p_expected_revision then
      raise exception 'ENTITY_REVISION_CONFLICT' using errcode = '40001';
    end if;
    update public.broker_accounts set
      broker_name = btrim(p_broker_name), display_name = btrim(p_display_name),
      base_currency = upper(p_base_currency), cost_method = p_cost_method,
      archived_at = case when p_archived then coalesce(archived_at, now()) else null end,
      revision = revision + 1
    where id = v_id and owner_id = v_owner_id returning * into v_result;
  end if;

  update private.mutation_requests set completed_revision = v_result.revision
  where owner_id = v_owner_id and idempotency_key = p_idempotency_key;
  return v_result;
end;
$$;

create or replace function public.save_asset(
  p_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_market text,
  p_symbol text,
  p_name text,
  p_asset_type text default 'STOCK'
)
returns public.assets
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_current public.assets;
  v_result public.assets;
  v_request private.mutation_requests;
  v_payload jsonb;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_id is null or p_idempotency_key is null then
    raise exception 'CLIENT_ID_AND_IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_EXPECTED_REVISION' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object(
    'expected_revision', p_expected_revision, 'market', p_market, 'symbol', p_symbol,
    'name', p_name, 'asset_type', p_asset_type
  );
  insert into private.mutation_requests (
    owner_id, idempotency_key, entity_type, entity_id, action, request_payload
  )
  values (v_owner_id, p_idempotency_key, 'ASSET', v_id,
    case when p_expected_revision = 0 then 'INSERT' else 'UPDATE' end, v_payload)
  on conflict (owner_id, idempotency_key) do nothing;
  if not found then
    select * into strict v_request from private.mutation_requests
    where owner_id = v_owner_id and idempotency_key = p_idempotency_key;
    if v_request.entity_type <> 'ASSET' or v_request.entity_id <> v_id
      or v_request.request_payload <> v_payload then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
    select * into strict v_result from public.assets where id = v_id and owner_id = v_owner_id;
    return v_result;
  end if;

  if p_expected_revision = 0 then
    insert into public.assets (id, owner_id, market, symbol, name, asset_type)
    values (v_id, v_owner_id, upper(btrim(p_market)), upper(btrim(p_symbol)), nullif(btrim(p_name), ''), p_asset_type)
    returning * into v_result;
  else
    select * into v_current from public.assets where id = v_id and owner_id = v_owner_id for update;
    if not found then raise exception 'ASSET_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_current.revision <> p_expected_revision then
      raise exception 'ENTITY_REVISION_CONFLICT' using errcode = '40001';
    end if;
    update public.assets set market = upper(btrim(p_market)), symbol = upper(btrim(p_symbol)),
      name = nullif(btrim(p_name), ''), asset_type = p_asset_type, revision = revision + 1
    where id = v_id and owner_id = v_owner_id returning * into v_result;
  end if;

  update private.mutation_requests set completed_revision = v_result.revision
  where owner_id = v_owner_id and idempotency_key = p_idempotency_key;
  return v_result;
end;
$$;

create or replace function public.save_trade(
  p_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_broker_account_id uuid,
  p_asset_id uuid,
  p_side text,
  p_status text,
  p_evidence_status text,
  p_executed_at timestamptz,
  p_quantity numeric,
  p_unit_price numeric,
  p_fee numeric,
  p_fee_status text,
  p_currency text,
  p_external_reference text default null,
  p_fingerprint text default null
)
returns public.trades
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_id uuid := auth.uid();
  v_id uuid := coalesce(p_id, gen_random_uuid());
  v_current public.trades;
  v_result public.trades;
  v_request private.mutation_requests;
  v_data_revision bigint;
  v_payload jsonb;
begin
  if v_owner_id is null then raise exception 'AUTH_REQUIRED' using errcode = '42501'; end if;
  if p_id is null or p_idempotency_key is null then
    raise exception 'CLIENT_ID_AND_IDEMPOTENCY_KEY_REQUIRED' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'INVALID_EXPECTED_REVISION' using errcode = '22023';
  end if;
  if p_status = 'CONFIRMED' and p_fee_status <> 'KNOWN' then
    raise exception 'CONFIRMED_TRADE_REQUIRES_KNOWN_FEE' using errcode = '22023';
  end if;

  v_payload := jsonb_build_object(
    'expected_revision', p_expected_revision, 'broker_account_id', p_broker_account_id,
    'asset_id', p_asset_id, 'side', p_side, 'status', p_status,
    'evidence_status', p_evidence_status, 'executed_at', p_executed_at,
    'quantity', p_quantity, 'unit_price', p_unit_price, 'fee', p_fee,
    'fee_status', p_fee_status, 'currency', p_currency,
    'external_reference', p_external_reference, 'fingerprint', p_fingerprint
  );
  insert into private.mutation_requests (
    owner_id, idempotency_key, entity_type, entity_id, action, request_payload
  )
  values (v_owner_id, p_idempotency_key, 'TRADE', v_id,
    case when p_expected_revision = 0 then 'INSERT' else 'UPDATE' end, v_payload)
  on conflict (owner_id, idempotency_key) do nothing;
  if not found then
    select * into strict v_request from private.mutation_requests
    where owner_id = v_owner_id and idempotency_key = p_idempotency_key;
    if v_request.entity_type <> 'TRADE' or v_request.entity_id <> v_id
      or v_request.request_payload <> v_payload then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = '22023';
    end if;
    select * into strict v_result from public.trades where id = v_id and owner_id = v_owner_id;
    return v_result;
  end if;

  perform 1 from public.broker_accounts
  where id = p_broker_account_id and owner_id = v_owner_id and archived_at is null;
  if not found then raise exception 'BROKER_ACCOUNT_NOT_FOUND_OR_ARCHIVED' using errcode = 'P0002'; end if;
  perform 1 from public.assets where id = p_asset_id and owner_id = v_owner_id;
  if not found then raise exception 'ASSET_NOT_FOUND' using errcode = 'P0002'; end if;

  if p_expected_revision > 0 then
    select * into v_current from public.trades where id = v_id and owner_id = v_owner_id for update;
    if not found then raise exception 'TRADE_NOT_FOUND' using errcode = 'P0002'; end if;
    if v_current.revision <> p_expected_revision then
      raise exception 'ENTITY_REVISION_CONFLICT' using errcode = '40001';
    end if;
    if v_current.broker_account_id <> p_broker_account_id or v_current.asset_id <> p_asset_id then
      raise exception 'TRADE_IDENTITY_IMMUTABLE' using errcode = '22023';
    end if;
  elsif p_expected_revision <> 0 then
    raise exception 'INVALID_EXPECTED_REVISION' using errcode = '22023';
  end if;

  update public.broker_accounts
  set data_revision = data_revision + 1
  where id = p_broker_account_id and owner_id = v_owner_id
  returning data_revision into v_data_revision;

  if p_expected_revision = 0 then
    insert into public.trades (
      id, owner_id, broker_account_id, asset_id, side, status, evidence_status,
      executed_at, quantity, unit_price, fee, fee_status, currency,
      external_reference, fingerprint, calculation_method, calculation_version,
      data_revision, cancelled_at
    ) values (
      v_id, v_owner_id, p_broker_account_id, p_asset_id, p_side, p_status, p_evidence_status,
      p_executed_at, p_quantity, p_unit_price, p_fee, p_fee_status, upper(p_currency),
      nullif(btrim(p_external_reference), ''), nullif(btrim(p_fingerprint), ''),
      (select cost_method from public.broker_accounts where id = p_broker_account_id), 1,
      v_data_revision, case when p_status = 'CANCELLED' then now() else null end
    ) returning * into v_result;
  else
    update public.trades set
      side = p_side, status = p_status, evidence_status = p_evidence_status,
      executed_at = p_executed_at, quantity = p_quantity, unit_price = p_unit_price,
      fee = p_fee, fee_status = p_fee_status, currency = upper(p_currency),
      external_reference = nullif(btrim(p_external_reference), ''),
      fingerprint = nullif(btrim(p_fingerprint), ''),
      calculation_method = (select cost_method from public.broker_accounts where id = p_broker_account_id),
      calculation_version = 1, data_revision = v_data_revision, revision = revision + 1,
      cancelled_at = case when p_status = 'CANCELLED' then coalesce(cancelled_at, now()) else null end
    where id = v_id and owner_id = v_owner_id returning * into v_result;
  end if;

  update private.mutation_requests set completed_revision = v_result.revision
  where owner_id = v_owner_id and idempotency_key = p_idempotency_key;
  return v_result;
end;
$$;

revoke all on function public.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean) from public, anon;
revoke all on function public.save_asset(uuid, bigint, uuid, text, text, text, text) from public, anon;
revoke all on function public.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text) from public, anon;
grant execute on function public.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.save_asset(uuid, bigint, uuid, text, text, text, text) to authenticated;
grant execute on function public.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text) to authenticated;

revoke all on all functions in schema private from public, anon, authenticated;

-- Private evidence bucket. Object names must begin with the authenticated user's UUID.
insert into storage.buckets (id, name, public)
values ('trade-evidence', 'trade-evidence', false)
on conflict (id) do update set public = false;

create policy evidence_objects_select_own on storage.objects for select to authenticated
using (bucket_id = 'trade-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy evidence_objects_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'trade-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy evidence_objects_update_own on storage.objects for update to authenticated
using (bucket_id = 'trade-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'trade-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy evidence_objects_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'trade-evidence' and (storage.foldername(name))[1] = (select auth.uid())::text);
