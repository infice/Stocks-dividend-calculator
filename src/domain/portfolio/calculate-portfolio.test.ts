import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculatePortfolio, type TradeEvent } from './calculate-portfolio.ts';

const trade = (overrides: Partial<TradeEvent>): TradeEvent => ({
  id: 'trade-1',
  accountId: 'account-a',
  assetId: 'asset-aapl',
  executedAt: '2026-01-01T09:30:00.000Z',
  sequence: 1,
  side: 'BUY',
  quantity: '1',
  unitPrice: '100',
  fee: '0',
  currency: 'USD',
  ...overrides,
});

describe('calculatePortfolio', () => {
  it('calculates FIFO with allocated buy and sell fees (TC-01)', () => {
    const result = calculatePortfolio(
      [
        trade({ id: 'buy', quantity: '3', fee: '3' }),
        trade({
          id: 'sell',
          side: 'SELL',
          executedAt: '2026-02-01T09:30:00.000Z',
          unitPrice: '140',
          fee: '2',
        }),
      ],
      'FIFO',
    );

    assert.deepEqual(
      {
        sellTradeId: result.realized[0].sellTradeId,
        grossProceeds: result.realized[0].grossProceeds,
        netProceeds: result.realized[0].netProceeds,
        matchedCost: result.realized[0].matchedCost,
        realizedPnl: result.realized[0].realizedPnl,
      },
      {
      sellTradeId: 'sell',
      grossProceeds: '140',
      netProceeds: '138',
      matchedCost: '101',
      realizedPnl: '37',
      },
    );
    assert.equal(result.positions[0].quantity, '2');
    assert.equal(result.positions[0].cost, '202');
  });

  for (const [method, pnl, cost] of [
    ['FIFO', '150', '200'],
    ['MOVING_AVERAGE', '100', '150'],
  ] as const) {
    it(`compares ${method} without mutating the trades (TC-15)`, () => {
      const trades = [
        trade({ id: 'buy-1', unitPrice: '100' }),
        trade({ id: 'buy-2', executedAt: '2026-01-02T09:30:00.000Z', unitPrice: '200' }),
        trade({
          id: 'sell',
          side: 'SELL',
          executedAt: '2026-01-03T09:30:00.000Z',
          unitPrice: '250',
        }),
      ];

      const result = calculatePortfolio(trades, method);

      assert.equal(result.realized[0].realizedPnl, pnl);
      assert.equal(result.positions[0].quantity, '1');
      assert.equal(result.positions[0].cost, cost);
      assert.equal(trades[0].quantity, '1');
    });
  }

  it('never matches a sale against another broker account (TC-02)', () => {
    const result = calculatePortfolio(
      [
        trade({ id: 'buy-a', accountId: 'account-a' }),
        trade({ id: 'buy-b', accountId: 'account-b', unitPrice: '80' }),
        trade({
          id: 'sell-a',
          accountId: 'account-a',
          side: 'SELL',
          executedAt: '2026-01-02T09:30:00.000Z',
          unitPrice: '120',
        }),
      ],
      'FIFO',
    );

    assert.equal(result.realized[0].matchedCost, '100');
    assert.ok(
      result.positions.some(
        (position) =>
          position.accountId === 'account-b' && position.quantity === '1' && position.cost === '80',
      ),
    );
  });

  it('blocks unknown fees instead of silently treating them as zero', () => {
    assert.throws(
      () => calculatePortfolio([trade({ fee: null })], 'FIFO'),
      /fee is unknown/i,
    );
  });

  it('rejects an oversold position atomically', () => {
    assert.throws(
      () =>
        calculatePortfolio(
        [
          trade({ id: 'buy' }),
          trade({
            id: 'sell',
            side: 'SELL',
            quantity: '1.5',
            executedAt: '2026-01-02T09:30:00.000Z',
          }),
        ],
        'MOVING_AVERAGE',
      ),
      /insufficient quantity/i,
    );
  });

  it('matches a sale across many FIFO lots without changing the result', () => {
    const buys = Array.from({ length: 100 }, (_, index) =>
      trade({ id: `buy-${index}`, sequence: index, quantity: '1', unitPrice: '1' }),
    );

    const result = calculatePortfolio(
      [
        ...buys,
        trade({
          id: 'sell-all',
          side: 'SELL',
          sequence: 100,
          quantity: '100',
          unitPrice: '2',
        }),
      ],
      'FIFO',
    );

    assert.equal(result.realized[0].matchedCost, '100');
    assert.equal(result.realized[0].realizedPnl, '100');
    assert.deepEqual(result.positions, []);
  });

  it('orders mixed-offset timestamps by their actual instant', () => {
    const result = calculatePortfolio(
      [
        trade({
          id: 'buy',
          executedAt: '2026-01-01T10:00:00+07:00',
          unitPrice: '100',
        }),
        trade({
          id: 'sell',
          side: 'SELL',
          executedAt: '2026-01-01T04:00:00Z',
          unitPrice: '120',
        }),
      ],
      'FIFO',
    );

    assert.equal(result.realized[0].sellTradeId, 'sell');
    assert.equal(result.realized[0].realizedPnl, '20');
    assert.deepEqual(result.positions, []);
  });

  for (const executedAt of [
    '2026-02-30T09:30:00Z',
    '2026-01-01 09:30:00Z',
    'not-a-date',
  ]) {
    it(`rejects invalid RFC 3339 timestamp ${executedAt}`, () => {
      assert.throws(
        () => calculatePortfolio([trade({ executedAt })], 'FIFO'),
        /executedAt is not a valid RFC 3339 timestamp/i,
      );
    });
  }

  for (const field of ['quantity', 'unitPrice', 'fee'] as const) {
    for (const value of ['NaN', 'Infinity', '-Infinity']) {
      it(`rejects non-finite ${field} value ${value}`, () => {
        assert.throws(
          () => calculatePortfolio([trade({ [field]: value })], 'FIFO'),
          /is not a valid decimal/i,
        );
      });
    }
  }
});
