import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildPortfolioView } from './portfolio-view.ts';
import type { FinancialSnapshot } from './financial-repository.ts';

const snapshot: FinancialSnapshot = {
  accounts: [{ id: 'account', owner_id: 'owner', broker_name: 'Broker', display_name: 'Main', base_currency: 'USD', cost_method: 'FIFO', revision: 1, data_revision: 2, archived_at: null, created_at: '', updated_at: '' }],
  assets: [{ id: 'asset', owner_id: 'owner', market: 'NASDAQ', symbol: 'AAPL', name: 'Apple', asset_type: 'STOCK', revision: 1, created_at: '', updated_at: '' }],
  trades: [],
  calculationEvents: [
    { id: 'buy', accountId: 'account', assetId: 'asset', executedAt: '2026-01-01T00:00:00Z', sequence: 1, side: 'BUY', quantity: '2', unitPrice: '100', fee: '0', currency: 'USD' },
    { id: 'sell', accountId: 'account', assetId: 'asset', executedAt: '2026-01-02T00:00:00Z', sequence: 2, side: 'SELL', quantity: '1', unitPrice: '140', fee: '0', currency: 'USD' },
  ],
  syncedAt: '2026-01-02T00:00:01Z',
};

describe('buildPortfolioView', () => {
  it('calculates each account with its configured cost method', () => {
    const view = buildPortfolioView(snapshot);
    assert.equal(view.positions[0].symbol, 'AAPL');
    assert.equal(view.positions[0].quantity, '1');
    assert.equal(view.realized[0].realizedPnl, '40');
    assert.deepEqual(view.totalsByCurrency, [{ currency: 'USD', realizedPnl: '40' }]);
    assert.deepEqual(view.issues, []);
  });

  it('reports an account calculation failure without hiding other accounts', () => {
    const view = buildPortfolioView({
      ...snapshot,
      calculationEvents: [snapshot.calculationEvents[1]],
    });
    assert.equal(view.positions.length, 0);
    assert.equal(view.issues[0].accountId, 'account');
  });
});
