import { randomUUID } from 'expo-crypto';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { TradeEvent } from '@/domain/portfolio/calculate-portfolio';
import { getSupabaseClient } from '@/lib/supabase';
import { DataAccessError, mapDataAccessError, toTradeEvent } from '@/services/financial-mappers';
import type {
  AssetRow,
  AssetType,
  BrokerAccountRow,
  CostMethod,
  Database,
  EvidenceStatus,
  FeeStatus,
  TradeRow,
  TradeSide,
  TradeStatus,
} from '@/types/database';

export { DataAccessError, mapDataAccessError, toTradeEvent } from '@/services/financial-mappers';
export type { DataErrorKind } from '@/services/financial-mappers';

export type FinancialSnapshot = {
  accounts: BrokerAccountRow[];
  assets: AssetRow[];
  trades: TradeRow[];
  calculationEvents: TradeEvent[];
  syncedAt: string;
};

export type SnapshotState =
  | { status: 'loading'; data: FinancialSnapshot | null; isStale: boolean; error: null }
  | { status: 'ready'; data: FinancialSnapshot; isStale: false; error: null }
  | { status: 'offline'; data: FinancialSnapshot | null; isStale: true; error: DataAccessError }
  | { status: 'error'; data: FinancialSnapshot | null; isStale: boolean; error: DataAccessError };

type Client = SupabaseClient<Database>;

const requireData = <T>(data: T | null, error: unknown): T => {
  if (error) throw mapDataAccessError(error);
  if (data === null) throw new DataAccessError('เซิร์ฟเวอร์ไม่ส่งข้อมูลกลับมา', 'unknown', 'EMPTY_RESPONSE', false);
  return data;
};

export async function listBrokerAccounts(
  options: { includeArchived?: boolean } = {},
  client: Client = getSupabaseClient(),
): Promise<BrokerAccountRow[]> {
  let query = client.from('broker_accounts').select('*').order('created_at');
  if (!options.includeArchived) query = query.is('archived_at', null);
  const { data, error } = await query;
  return requireData(data, error) as BrokerAccountRow[];
}

export async function listAssets(client: Client = getSupabaseClient()): Promise<AssetRow[]> {
  const { data, error } = await client.from('assets').select('*').order('symbol');
  return requireData(data, error) as AssetRow[];
}

export async function listTrades(client: Client = getSupabaseClient()): Promise<TradeRow[]> {
  const pageSize = 500;
  const trades: TradeRow[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await client.rpc('list_trades').range(from, from + pageSize - 1);
    const page = requireData(data, error) as TradeRow[];
    trades.push(...page);
    if (page.length < pageSize) return trades;
  }
}

export async function loadFinancialSnapshot(client: Client = getSupabaseClient()): Promise<FinancialSnapshot> {
  const [accounts, assets, trades] = await Promise.all([
    listBrokerAccounts({ includeArchived: true }, client),
    listAssets(client),
    listTrades(client),
  ]);

  return {
    accounts,
    assets,
    trades,
    calculationEvents: trades.flatMap((trade) => {
      const event = toTradeEvent(trade);
      return event ? [event] : [];
    }),
    syncedAt: new Date().toISOString(),
  };
}

export async function loadFinancialSnapshotState(
  previous: FinancialSnapshot | null,
  client: Client = getSupabaseClient(),
): Promise<SnapshotState> {
  try {
    return { status: 'ready', data: await loadFinancialSnapshot(client), isStale: false, error: null };
  } catch (error) {
    const mapped = mapDataAccessError(error);
    if (mapped.kind === 'network') {
      return { status: 'offline', data: previous, isStale: true, error: mapped };
    }
    return { status: 'error', data: previous, isStale: previous !== null, error: mapped };
  }
}

export type SaveBrokerAccountInput = {
  id?: string;
  expectedRevision?: number;
  idempotencyKey?: string;
  brokerName: string;
  displayName: string;
  baseCurrency: string;
  costMethod: CostMethod;
  archived?: boolean;
};

export async function saveBrokerAccount(input: SaveBrokerAccountInput, client: Client = getSupabaseClient()) {
  const { data, error } = await client.rpc('save_broker_account', {
    p_id: input.id ?? randomUUID(),
    p_expected_revision: input.expectedRevision ?? 0,
    p_idempotency_key: input.idempotencyKey ?? randomUUID(),
    p_broker_name: input.brokerName,
    p_display_name: input.displayName,
    p_base_currency: input.baseCurrency.toUpperCase(),
    p_cost_method: input.costMethod,
    p_archived: input.archived ?? false,
  });
  return requireData(data, error) as BrokerAccountRow;
}

export type SaveAssetInput = {
  id?: string;
  expectedRevision?: number;
  idempotencyKey?: string;
  market: string;
  symbol: string;
  name?: string;
  assetType?: AssetType;
};

export async function saveAsset(input: SaveAssetInput, client: Client = getSupabaseClient()) {
  const { data, error } = await client.rpc('save_asset', {
    p_id: input.id ?? randomUUID(),
    p_expected_revision: input.expectedRevision ?? 0,
    p_idempotency_key: input.idempotencyKey ?? randomUUID(),
    p_market: input.market,
    p_symbol: input.symbol,
    p_name: input.name ?? '',
    p_asset_type: input.assetType ?? 'STOCK',
  });
  return requireData(data, error) as AssetRow;
}

export async function findOrCreateAsset(input: SaveAssetInput, client: Client = getSupabaseClient()) {
  const market = input.market.trim().toUpperCase();
  const symbol = input.symbol.trim().toUpperCase();
  try {
    return await saveAsset({ ...input, market, symbol }, client);
  } catch (error) {
    const mapped = mapDataAccessError(error);
    if (mapped.code !== '23505') throw mapped;

    const winner = (await listAssets(client)).find(
      (asset) => asset.market === market && asset.symbol === symbol,
    );
    if (winner) return winner;
    throw mapped;
  }
}

export type SaveTradeInput = {
  id?: string;
  expectedRevision?: number;
  idempotencyKey?: string;
  brokerAccountId: string;
  assetId: string;
  side: TradeSide;
  status: TradeStatus;
  evidenceStatus?: EvidenceStatus;
  executedAt: string | null;
  quantity: string | null;
  unitPrice: string | null;
  fee: string | null;
  feeStatus: FeeStatus;
  currency: string | null;
  externalReference?: string | null;
  fingerprint?: string | null;
};

export async function saveTrade(input: SaveTradeInput, client: Client = getSupabaseClient()) {
  const { data, error } = await client.rpc('save_trade', {
    p_id: input.id ?? randomUUID(),
    p_expected_revision: input.expectedRevision ?? 0,
    p_idempotency_key: input.idempotencyKey ?? randomUUID(),
    p_broker_account_id: input.brokerAccountId,
    p_asset_id: input.assetId,
    p_side: input.side,
    p_status: input.status,
    p_evidence_status: input.evidenceStatus ?? 'CALCULABLE',
    p_executed_at: input.executedAt,
    p_quantity: input.quantity,
    p_unit_price: input.unitPrice,
    p_fee: input.fee,
    p_fee_status: input.feeStatus,
    p_currency: input.currency?.toUpperCase() ?? null,
    p_external_reference: input.externalReference ?? null,
    p_fingerprint: input.fingerprint ?? null,
  });
  return requireData(data, error) as TradeRow;
}
