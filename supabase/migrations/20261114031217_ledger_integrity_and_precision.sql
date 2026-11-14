-- Make profile creation complete for projects that already had Auth users when
-- the ledger schema was installed.
insert into public.profiles (id, display_name)
select id, nullif(coalesce(raw_user_meta_data ->> 'display_name', raw_user_meta_data ->> 'name'), '')
from auth.users
on conflict (id) do nothing;

-- Serialize mutations per broker account and reject any confirmed timeline
-- whose running quantity becomes negative. This keeps the invariant in the
-- database even when a client is stale or bypasses the calculation UI.
create or replace function private.enforce_trade_position()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_min_balance numeric;
begin
  perform 1
  from public.broker_accounts
  where id = new.broker_account_id and owner_id = new.owner_id
  for update;

  with ledger as (
    select id, executed_at, event_sequence,
      case when side = 'BUY' then quantity else -quantity end as delta
    from public.trades
    where owner_id = new.owner_id
      and broker_account_id = new.broker_account_id
      and asset_id = new.asset_id
      and status = 'CONFIRMED'
      and id <> new.id
    union all
    select new.id, new.executed_at, new.event_sequence,
      case when new.side = 'BUY' then new.quantity else -new.quantity end
    where new.status = 'CONFIRMED'
  ), running as (
    select sum(delta) over (
      order by executed_at, event_sequence, id
      rows between unbounded preceding and current row
    ) as balance
    from ledger
  )
  select min(balance) into v_min_balance from running;

  if coalesce(v_min_balance, 0) < 0 then
    raise exception 'INSUFFICIENT_POSITION' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_trade_position() from public, anon, authenticated;

drop trigger if exists trades_enforce_position on public.trades;
create trigger trades_enforce_position
before insert or update of broker_account_id, asset_id, side, status, executed_at, event_sequence, quantity
on public.trades
for each row execute function private.enforce_trade_position();

-- PostgREST normally serializes PostgreSQL numeric values as JSON numbers.
-- Return ledger decimals as text so JavaScript never rounds numeric(38,18).
create or replace function public.list_trades()
returns table (
  id uuid,
  owner_id uuid,
  broker_account_id uuid,
  asset_id uuid,
  side text,
  status text,
  evidence_status text,
  executed_at timestamptz,
  event_sequence bigint,
  quantity text,
  unit_price text,
  fee text,
  fee_status text,
  currency text,
  external_reference text,
  fingerprint text,
  calculation_method text,
  calculation_version integer,
  data_revision bigint,
  revision bigint,
  cancelled_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.id, t.owner_id, t.broker_account_id, t.asset_id, t.side, t.status,
    t.evidence_status, t.executed_at, t.event_sequence,
    t.quantity::text, t.unit_price::text, t.fee::text, t.fee_status,
    t.currency, t.external_reference, t.fingerprint, t.calculation_method,
    t.calculation_version, t.data_revision, t.revision, t.cancelled_at,
    t.created_at, t.updated_at
  from public.trades t
  where t.owner_id = (select auth.uid())
  order by t.executed_at nulls last, t.event_sequence, t.id;
$$;

revoke all on function public.list_trades() from public, anon;
grant execute on function public.list_trades() to authenticated;

drop function public.save_trade(
  uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz,
  numeric, numeric, numeric, text, text, text, text
);

create function public.save_trade(
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
returns jsonb
language sql
security invoker
set search_path = ''
as $$
  select to_jsonb(t) || jsonb_build_object(
    'quantity', t.quantity::text,
    'unit_price', t.unit_price::text,
    'fee', t.fee::text
  )
  from private.save_trade(
    p_id, p_expected_revision, p_idempotency_key, p_broker_account_id,
    p_asset_id, p_side, p_status, p_evidence_status, p_executed_at,
    p_quantity, p_unit_price, p_fee, p_fee_status, p_currency,
    p_external_reference, p_fingerprint
  ) as t;
$$;

revoke all on function public.save_trade(
  uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz,
  numeric, numeric, numeric, text, text, text, text
) from public, anon;
grant execute on function public.save_trade(
  uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz,
  numeric, numeric, numeric, text, text, text, text
) to authenticated;
