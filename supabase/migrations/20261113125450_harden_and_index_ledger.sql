-- The dashboard's automatic-RLS trigger does not need to be callable through
-- PostgREST. Trigger execution is unaffected by revoking direct EXECUTE.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke all on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end;
$$;

-- Keep privileged implementations outside the exposed public schema. Public
-- RPCs below are invoker-rights wrappers, while the private implementations
-- keep the auth.uid() checks and atomic access to the private receipt ledger.
alter function public.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean)
  set schema private;
alter function public.save_asset(uuid, bigint, uuid, text, text, text, text)
  set schema private;
alter function public.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text)
  set schema private;

revoke all on function private.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean) from public, anon, authenticated;
revoke all on function private.save_asset(uuid, bigint, uuid, text, text, text, text) from public, anon, authenticated;
revoke all on function private.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean) to authenticated;
grant execute on function private.save_asset(uuid, bigint, uuid, text, text, text, text) to authenticated;
grant execute on function private.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text) to authenticated;

create function public.save_broker_account(
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
language sql
security invoker
set search_path = ''
as $$
  select private.save_broker_account(
    p_id, p_expected_revision, p_idempotency_key, p_broker_name,
    p_display_name, p_base_currency, p_cost_method, p_archived
  );
$$;

create function public.save_asset(
  p_id uuid,
  p_expected_revision bigint,
  p_idempotency_key uuid,
  p_market text,
  p_symbol text,
  p_name text,
  p_asset_type text default 'STOCK'
)
returns public.assets
language sql
security invoker
set search_path = ''
as $$
  select private.save_asset(
    p_id, p_expected_revision, p_idempotency_key, p_market,
    p_symbol, p_name, p_asset_type
  );
$$;

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
returns public.trades
language sql
security invoker
set search_path = ''
as $$
  select private.save_trade(
    p_id, p_expected_revision, p_idempotency_key, p_broker_account_id,
    p_asset_id, p_side, p_status, p_evidence_status, p_executed_at,
    p_quantity, p_unit_price, p_fee, p_fee_status, p_currency,
    p_external_reference, p_fingerprint
  );
$$;

revoke all on function public.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean) from public, anon;
revoke all on function public.save_asset(uuid, bigint, uuid, text, text, text, text) from public, anon;
revoke all on function public.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text) from public, anon;
grant execute on function public.save_broker_account(uuid, bigint, uuid, text, text, text, text, boolean) to authenticated;
grant execute on function public.save_asset(uuid, bigint, uuid, text, text, text, text) to authenticated;
grant execute on function public.save_trade(uuid, bigint, uuid, uuid, uuid, text, text, text, timestamptz, numeric, numeric, numeric, text, text, text, text) to authenticated;

-- Keep the private idempotency ledger explicitly closed to direct clients.
create policy mutation_requests_no_direct_access
on private.mutation_requests
for all
to authenticated
using (false)
with check (false);

-- Cover composite foreign keys in their declared column order. The read-path
-- indexes intentionally start with owner_id and serve a different purpose.
create index trades_account_owner_fk_idx
  on public.trades(broker_account_id, owner_id);
create index trades_asset_owner_fk_idx
  on public.trades(asset_id, owner_id);
create index evidence_trade_owner_fk_idx
  on public.evidence_files(trade_id, owner_id);
create index audit_events_actor_id_idx
  on public.audit_events(actor_id);
