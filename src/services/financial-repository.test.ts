import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { mapDataAccessError, toTradeEvent } from './financial-mappers.ts';

const confirmedTrade = {
  id: 'trade-1',
  owner_id: 'owner-1',
  broker_account_id: 'account-1',
  asset_id: 'asset-1',
  side: 'BUY' as const,
  status: 'CONFIRMED' as const,
  evidence_status: 'CALCULABLE' as const,
  executed_at: '2026-11-13T10:00:00+07:00',
  event_sequence: 12,
  quantity: '1.25',
  unit_price: '100.50',
  fee: '0',
  fee_status: 'KNOWN' as const,
  currency: 'USD',
  external_reference: null,
  fingerprint: null,
  calculation_method: 'FIFO' as const,
  calculation_version: 1,
  data_revision: 2,
  revision: 1,
  cancelled_at: null,
  created_at: '2026-11-13T03:00:00Z',
  updated_at: '2026-11-13T03:00:00Z',
};

describe('financial repository mapping', () => {
  it('maps a confirmed database trade into the calculation event contract', () => {
    assert.deepEqual(toTradeEvent(confirmedTrade), {
      id: 'trade-1',
      accountId: 'account-1',
      assetId: 'asset-1',
      executedAt: '2026-11-13T10:00:00+07:00',
      sequence: 12,
      side: 'BUY',
      quantity: '1.25',
      unitPrice: '100.50',
      fee: '0',
      currency: 'USD',
    });
  });

  it('excludes draft and incomplete trades from the calculation core', () => {
    assert.equal(toTradeEvent({ ...confirmedTrade, status: 'DRAFT' }), null);
    assert.equal(toTradeEvent({ ...confirmedTrade, fee_status: 'UNKNOWN', fee: null }), null);
  });

  it('classifies revision conflicts for a user-visible reload flow', () => {
    const error = mapDataAccessError({ code: '40001', message: 'ENTITY_REVISION_CONFLICT' });
    assert.equal(error.kind, 'conflict');
    assert.equal(error.code, 'ENTITY_REVISION_CONFLICT');
    assert.equal(error.retryable, false);
  });

  it('classifies connectivity failures as retryable without hiding stale state', () => {
    const error = mapDataAccessError(new TypeError('Failed to fetch'));
    assert.equal(error.kind, 'network');
    assert.equal(error.retryable, true);
  });

  it('classifies a reused idempotency key separately from a revision conflict', () => {
    const error = mapDataAccessError({ message: 'IDEMPOTENCY_KEY_REUSED' });
    assert.equal(error.kind, 'duplicate');
    assert.equal(error.code, 'IDEMPOTENCY_KEY_REUSED');
    assert.equal(error.retryable, false);
  });

  it('classifies expired and invalid auth sessions for a sign-in flow', () => {
    const error = mapDataAccessError({ code: 'invalid_credentials', message: 'Invalid login credentials' });
    assert.equal(error.kind, 'auth');
    assert.equal(error.code, 'invalid_credentials');
    assert.equal(error.retryable, false);
  });

  it('shows a specific validation error when a sale would make the position negative', () => {
    const error = mapDataAccessError({ code: '23514', message: 'INSUFFICIENT_POSITION' });
    assert.equal(error.kind, 'validation');
    assert.equal(error.code, 'INSUFFICIENT_POSITION');
    assert.match(error.message, /จำนวนหุ้นไม่พอ/);
  });

  it('classifies missing entities separately from validation failures', () => {
    const error = mapDataAccessError({ code: 'P0002', message: 'ASSET_NOT_FOUND' });
    assert.equal(error.kind, 'not_found');
  });

  it('explains why calculation settings cannot change without a replay', () => {
    const error = mapDataAccessError({ code: '23514', message: 'ACCOUNT_CONFIG_CHANGE_REQUIRES_REPLAY' });
    assert.equal(error.kind, 'validation');
    assert.equal(error.code, 'ACCOUNT_CONFIG_CHANGE_REQUIRES_REPLAY');
    assert.match(error.message, /คำนวณใหม่/);
  });

  it('classifies database uniqueness conflicts as duplicate data', () => {
    const error = mapDataAccessError({ code: '23505', message: 'duplicate key value' });
    assert.equal(error.kind, 'duplicate');
    assert.equal(error.code, '23505');
  });
});
