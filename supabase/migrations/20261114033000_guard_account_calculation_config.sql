-- Changing currency or cost method after trades exist requires a dedicated
-- preview-and-replay workflow. Keep this invariant in PostgreSQL so older or
-- modified clients cannot silently reinterpret historical calculations.
create or replace function private.enforce_account_calculation_config()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.base_currency, new.cost_method) is distinct from (old.base_currency, old.cost_method)
    and exists (
      select 1
      from public.trades
      where broker_account_id = old.id and owner_id = old.owner_id
    )
  then
    raise exception 'ACCOUNT_CONFIG_CHANGE_REQUIRES_REPLAY' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_account_calculation_config() from public, anon, authenticated;

drop trigger if exists broker_accounts_guard_calculation_config on public.broker_accounts;
create trigger broker_accounts_guard_calculation_config
before update of base_currency, cost_method
on public.broker_accounts
for each row execute function private.enforce_account_calculation_config();
