import type { TradeEvent } from '@/domain/portfolio/calculate-portfolio';
import type { TradeRow } from '@/types/database';

export type DataErrorKind = 'auth' | 'conflict' | 'duplicate' | 'network' | 'not_found' | 'validation' | 'unknown';

export class DataAccessError extends Error {
  readonly kind: DataErrorKind;
  readonly code: string;
  readonly retryable: boolean;

  constructor(message: string, kind: DataErrorKind, code: string, retryable: boolean) {
    super(message);
    this.name = 'DataAccessError';
    this.kind = kind;
    this.code = code;
    this.retryable = retryable;
  }
}

const readError = (error: unknown) => {
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return {
      code: typeof record.code === 'string' ? record.code : '',
      message: typeof record.message === 'string' ? record.message : String(error),
    };
  }
  return { code: '', message: String(error) };
};

export function mapDataAccessError(error: unknown): DataAccessError {
  if (error instanceof DataAccessError) return error;
  const { code, message } = readError(error);
  const normalized = message.toUpperCase();

  if (code === '40001' || normalized.includes('ENTITY_REVISION_CONFLICT')) {
    return new DataAccessError('ข้อมูลถูกแก้จากอุปกรณ์อื่น กรุณาโหลดข้อมูลล่าสุด', 'conflict', 'ENTITY_REVISION_CONFLICT', false);
  }
  if (normalized.includes('IDEMPOTENCY_KEY_REUSED')) {
    return new DataAccessError('คำขอนี้ถูกใช้กับข้อมูลอื่นแล้ว', 'duplicate', 'IDEMPOTENCY_KEY_REUSED', false);
  }
  if (
    code === '42501' ||
    code === 'invalid_credentials' ||
    code === 'refresh_token_not_found' ||
    code === 'refresh_token_already_used' ||
    normalized.includes('AUTH_REQUIRED') ||
    normalized.includes('JWT') ||
    normalized.includes('INVALID LOGIN CREDENTIALS')
  ) {
    return new DataAccessError('เซสชันหมดอายุ กรุณาเข้าสู่ระบบอีกครั้ง', 'auth', code || 'AUTH_REQUIRED', false);
  }
  if (error instanceof TypeError || normalized.includes('FAILED TO FETCH') || normalized.includes('NETWORK')) {
    return new DataAccessError('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'network', 'NETWORK_UNAVAILABLE', true);
  }
  if (normalized.includes('INSUFFICIENT_POSITION')) {
    return new DataAccessError('จำนวนหุ้นไม่พอสำหรับรายการขายนี้', 'validation', 'INSUFFICIENT_POSITION', false);
  }
  if (normalized.includes('ACCOUNT_CONFIG_CHANGE_REQUIRES_REPLAY')) {
    return new DataAccessError('บัญชีนี้มีรายการแล้ว ต้องดูตัวอย่างผลกระทบและคำนวณใหม่ก่อนเปลี่ยนสกุลเงินหรือวิธีต้นทุน', 'validation', 'ACCOUNT_CONFIG_CHANGE_REQUIRES_REPLAY', false);
  }
  if (code === '23505') {
    return new DataAccessError('พบข้อมูลซ้ำ กรุณาตรวจรายการเดิมหรือใช้เลขอ้างอิงอื่น', 'duplicate', code, false);
  }
  if (code === '22023' || code === '23514') {
    return new DataAccessError('ข้อมูลไม่ผ่านเงื่อนไขการบันทึก', 'validation', code, false);
  }
  if (code === 'P0002' || normalized.includes('_NOT_FOUND')) {
    return new DataAccessError('ไม่พบข้อมูลที่ต้องการ หรือข้อมูลถูกเปลี่ยนแล้ว', 'not_found', code || 'NOT_FOUND', false);
  }
  if (code === 'weak_password' || code === 'email_address_invalid' || code === 'validation_failed') {
    return new DataAccessError('ข้อมูลบัญชีไม่ผ่านเงื่อนไข กรุณาตรวจสอบอีกครั้ง', 'validation', code, false);
  }
  return new DataAccessError(message || 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ', 'unknown', code || 'UNKNOWN', false);
}

export function toTradeEvent(trade: TradeRow): TradeEvent | null {
  if (
    trade.status !== 'CONFIRMED' ||
    trade.fee_status !== 'KNOWN' ||
    !trade.executed_at ||
    trade.quantity === null ||
    trade.unit_price === null ||
    trade.fee === null ||
    !trade.currency
  ) {
    return null;
  }

  return {
    id: trade.id,
    accountId: trade.broker_account_id,
    assetId: trade.asset_id,
    executedAt: trade.executed_at,
    sequence: trade.event_sequence,
    side: trade.side,
    quantity: trade.quantity,
    unitPrice: trade.unit_price,
    fee: trade.fee,
    currency: trade.currency,
  };
}
