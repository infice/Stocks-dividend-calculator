import { Decimal } from 'decimal.js';

const Money = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export type CostMethod = 'FIFO' | 'MOVING_AVERAGE';

export type TradeEvent = {
  id: string;
  accountId: string;
  assetId: string;
  executedAt: string;
  sequence: number;
  side: 'BUY' | 'SELL';
  quantity: string;
  unitPrice: string;
  fee: string | null;
  currency: string;
};

export type RealizedCalculation = {
  sellTradeId: string;
  accountId: string;
  assetId: string;
  currency: string;
  grossProceeds: string;
  netProceeds: string;
  matchedCost: string;
  realizedPnl: string;
  method: CostMethod;
};

export type Position = {
  accountId: string;
  assetId: string;
  currency: string;
  quantity: string;
  cost: string;
};

type Lot = { quantity: Decimal; cost: Decimal };
type Pool = {
  accountId: string;
  assetId: string;
  currency: string;
  quantity: Decimal;
  cost: Decimal;
  lots: Lot[];
  lotHead: number;
};

const decimal = (value: string, field: string, tradeId: string) => {
  try {
    const result = new Money(value);
    if (!result.isFinite()) {
      throw new Error('non-finite decimal');
    }
    return result;
  } catch {
    throw new Error(`Trade ${tradeId}: ${field} is not a valid decimal`);
  }
};

const asText = (value: Decimal) => value.toDecimalPlaces(20).toString();

const positionKey = (trade: TradeEvent) =>
  JSON.stringify([trade.accountId, trade.assetId, trade.currency]);

const executedAtPattern =
  /^(\d{4})-(\d{2})-(\d{2})T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d+)?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;

const parseExecutedAt = (trade: TradeEvent) => {
  const match = executedAtPattern.exec(trade.executedAt);
  const epoch = Date.parse(trade.executedAt);
  if (!match || !Number.isFinite(epoch)) {
    throw new Error(`Trade ${trade.id}: executedAt is not a valid RFC 3339 timestamp`);
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const isLeapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const daysInMonth = [31, isLeapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][
    month - 1
  ];
  if (!daysInMonth || day < 1 || day > daysInMonth) {
    throw new Error(`Trade ${trade.id}: executedAt is not a valid RFC 3339 timestamp`);
  }

  return epoch;
};

const compareIds = (left: string, right: string) =>
  left < right ? -1 : left > right ? 1 : 0;

export function calculatePortfolio(
  tradeEvents: readonly TradeEvent[],
  method: CostMethod,
): { realized: RealizedCalculation[]; positions: Position[] } {
  const seenIds = new Set<string>();
  const pools = new Map<string, Pool>();
  const realized: RealizedCalculation[] = [];

  const orderedTrades = tradeEvents
    .map((trade) => ({ trade, executedAtEpoch: parseExecutedAt(trade) }))
    .sort(
      (left, right) =>
        left.executedAtEpoch - right.executedAtEpoch ||
        left.trade.sequence - right.trade.sequence ||
        compareIds(left.trade.id, right.trade.id),
    );

  for (const { trade } of orderedTrades) {
    if (seenIds.has(trade.id)) {
      throw new Error(`Trade ${trade.id}: duplicate id`);
    }
    seenIds.add(trade.id);

    if (trade.fee === null) {
      throw new Error(`Trade ${trade.id}: fee is unknown`);
    }

    const quantity = decimal(trade.quantity, 'quantity', trade.id);
    const unitPrice = decimal(trade.unitPrice, 'unit price', trade.id);
    const fee = decimal(trade.fee, 'fee', trade.id);
    if (!quantity.greaterThan(0) || unitPrice.isNegative() || fee.isNegative()) {
      throw new Error(`Trade ${trade.id}: quantity must be positive and amounts cannot be negative`);
    }

    const key = positionKey(trade);
    const pool = pools.get(key) ?? {
      accountId: trade.accountId,
      assetId: trade.assetId,
      currency: trade.currency,
      quantity: new Money(0),
      cost: new Money(0),
      lots: [],
      lotHead: 0,
    };

    if (trade.side === 'BUY') {
      const cost = quantity.mul(unitPrice).plus(fee);
      pool.quantity = pool.quantity.plus(quantity);
      pool.cost = pool.cost.plus(cost);
      if (method === 'FIFO') {
        pool.lots.push({ quantity, cost });
      }
      pools.set(key, pool);
      continue;
    }

    if (quantity.greaterThan(pool.quantity)) {
      throw new Error(`Trade ${trade.id}: insufficient quantity for sale`);
    }

    let matchedCost: Decimal;
    if (method === 'MOVING_AVERAGE') {
      matchedCost = pool.cost.mul(quantity).div(pool.quantity);
      pool.quantity = pool.quantity.minus(quantity);
      pool.cost = pool.cost.minus(matchedCost);
    } else {
      matchedCost = new Money(0);
      let quantityToMatch = quantity;

      while (quantityToMatch.greaterThan(0)) {
        const lot = pool.lots[pool.lotHead];
        if (!lot) {
          throw new Error(`Trade ${trade.id}: insufficient quantity for sale`);
        }

        const matchedQuantity = Decimal.min(quantityToMatch, lot.quantity);
        const allocatedCost = lot.cost.mul(matchedQuantity).div(lot.quantity);
        matchedCost = matchedCost.plus(allocatedCost);
        lot.quantity = lot.quantity.minus(matchedQuantity);
        lot.cost = lot.cost.minus(allocatedCost);
        quantityToMatch = quantityToMatch.minus(matchedQuantity);

        if (lot.quantity.isZero()) {
          pool.lotHead += 1;
        }
      }

      if (pool.lotHead > 64 && pool.lotHead * 2 > pool.lots.length) {
        pool.lots = pool.lots.slice(pool.lotHead);
        pool.lotHead = 0;
      }

      pool.quantity = pool.quantity.minus(quantity);
      pool.cost = pool.cost.minus(matchedCost);
    }

    const grossProceeds = quantity.mul(unitPrice);
    const netProceeds = grossProceeds.minus(fee);
    realized.push({
      sellTradeId: trade.id,
      accountId: trade.accountId,
      assetId: trade.assetId,
      currency: trade.currency,
      grossProceeds: asText(grossProceeds),
      netProceeds: asText(netProceeds),
      matchedCost: asText(matchedCost),
      realizedPnl: asText(netProceeds.minus(matchedCost)),
      method,
    });
    pools.set(key, pool);
  }

  const positions = [...pools.entries()]
    .filter(([, pool]) => pool.quantity.greaterThan(0))
    .map(([, pool]) => {
      return {
        accountId: pool.accountId,
        assetId: pool.assetId,
        currency: pool.currency,
        quantity: asText(pool.quantity),
        cost: asText(pool.cost),
      };
    })
    .sort((left, right) =>
      left.accountId.localeCompare(right.accountId) ||
      left.assetId.localeCompare(right.assetId) ||
      left.currency.localeCompare(right.currency),
    );

  return { realized, positions };
}
