export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type CostMethod = 'FIFO' | 'MOVING_AVERAGE';
export type TradeSide = 'BUY' | 'SELL';
export type TradeStatus = 'DRAFT' | 'NEEDS_REVIEW' | 'CONFIRMED' | 'CANCELLED';
export type EvidenceStatus = 'NONE' | 'CALCULABLE' | 'DOCUMENT_VERIFIED' | 'RECONCILED';
export type FeeStatus = 'KNOWN' | 'UNKNOWN';
export type AssetType = 'STOCK' | 'ETF';

export type BrokerAccountRow = {
  id: string;
  owner_id: string;
  broker_name: string;
  display_name: string;
  base_currency: string;
  cost_method: CostMethod;
  revision: number;
  data_revision: number;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssetRow = {
  id: string;
  owner_id: string;
  market: string;
  symbol: string;
  name: string | null;
  asset_type: AssetType;
  revision: number;
  created_at: string;
  updated_at: string;
};

export type TradeRow = {
  id: string;
  owner_id: string;
  broker_account_id: string;
  asset_id: string;
  side: TradeSide;
  status: TradeStatus;
  evidence_status: EvidenceStatus;
  executed_at: string | null;
  event_sequence: number;
  quantity: string | null;
  unit_price: string | null;
  fee: string | null;
  fee_status: FeeStatus;
  currency: string | null;
  external_reference: string | null;
  fingerprint: string | null;
  calculation_method: CostMethod | null;
  calculation_version: number | null;
  data_revision: number;
  revision: number;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
};

type TableDefinition<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      broker_accounts: TableDefinition<BrokerAccountRow>;
      assets: TableDefinition<AssetRow>;
      trades: TableDefinition<TradeRow>;
      profiles: TableDefinition<{
        id: string;
        display_name: string | null;
        locale: string;
        created_at: string;
        updated_at: string;
      }>;
      evidence_files: TableDefinition<{
        id: string;
        owner_id: string;
        trade_id: string | null;
        storage_path: string;
        file_name: string;
        mime_type: string;
        byte_size: number;
        sha256: string | null;
        status: 'UPLOADED' | 'VERIFIED' | 'REJECTED';
        revision: number;
        created_at: string;
        updated_at: string;
      }>;
      audit_events: TableDefinition<{
        id: number;
        owner_id: string;
        entity_type: 'BROKER_ACCOUNT' | 'ASSET' | 'TRADE' | 'EVIDENCE';
        entity_id: string;
        action: 'INSERT' | 'UPDATE' | 'DELETE';
        entity_revision: number;
        actor_id: string | null;
        snapshot: Json;
        occurred_at: string;
      }>;
    };
    Views: Record<never, never>;
    Functions: {
      list_trades: {
        Args: Record<never, never>;
        Returns: TradeRow[];
      };
      save_broker_account: {
        Args: {
          p_id: string;
          p_expected_revision: number;
          p_idempotency_key: string;
          p_broker_name: string;
          p_display_name: string;
          p_base_currency: string;
          p_cost_method: CostMethod;
          p_archived?: boolean;
        };
        Returns: BrokerAccountRow;
      };
      save_asset: {
        Args: {
          p_id: string;
          p_expected_revision: number;
          p_idempotency_key: string;
          p_market: string;
          p_symbol: string;
          p_name: string;
          p_asset_type?: AssetType;
        };
        Returns: AssetRow;
      };
      save_trade: {
        Args: {
          p_id: string;
          p_expected_revision: number;
          p_idempotency_key: string;
          p_broker_account_id: string;
          p_asset_id: string;
          p_side: TradeSide;
          p_status: TradeStatus;
          p_evidence_status: EvidenceStatus;
          p_executed_at: string | null;
          p_quantity: string | null;
          p_unit_price: string | null;
          p_fee: string | null;
          p_fee_status: FeeStatus;
          p_currency: string | null;
          p_external_reference?: string | null;
          p_fingerprint?: string | null;
        };
        Returns: TradeRow;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
};
