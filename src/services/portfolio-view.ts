import { Decimal } from 'decimal.js';

import { calculatePortfolio, type Position, type RealizedCalculation } from '../domain/portfolio/calculate-portfolio.ts';
import type { FinancialSnapshot } from './financial-repository.ts';

export type PortfolioPosition = Position & {
  symbol: string;
  name: string;
  accountName: string;
};

export type PortfolioView = {
  positions: PortfolioPosition[];
  realized: RealizedCalculation[];
  totalsByCurrency: { currency: string; realizedPnl: string }[];
  issues: { accountId: string; message: string }[];
};

export function buildPortfolioView(snapshot: FinancialSnapshot): PortfolioView {
  const positions: PortfolioPosition[] = [];
  const realized: RealizedCalculation[] = [];
  const issues: PortfolioView['issues'] = [];
  const assets = new Map(snapshot.assets.map((asset) => [asset.id, asset]));
  const eventsByAccount = new Map<string, typeof snapshot.calculationEvents>();
  for (const event of snapshot.calculationEvents) {
    const events = eventsByAccount.get(event.accountId) ?? [];
    events.push(event);
    eventsByAccount.set(event.accountId, events);
  }

  for (const account of snapshot.accounts) {
    try {
      const result = calculatePortfolio(
        eventsByAccount.get(account.id) ?? [],
        account.cost_method,
      );
      realized.push(...result.realized);
      positions.push(...result.positions.map((position) => {
        const asset = assets.get(position.assetId);
        return {
          ...position,
          symbol: asset?.symbol ?? 'ไม่ทราบ',
          name: asset?.name ?? asset?.market ?? 'สินทรัพย์ไม่ทราบชื่อ',
          accountName: account.display_name,
        };
      }));
    } catch (error) {
      issues.push({
        accountId: account.id,
        message: error instanceof Error ? error.message : 'คำนวณพอร์ตไม่สำเร็จ',
      });
    }
  }

  const totals = new Map<string, Decimal>();
  for (const item of realized) {
    totals.set(item.currency, (totals.get(item.currency) ?? new Decimal(0)).plus(item.realizedPnl));
  }

  return {
    positions,
    realized,
    totalsByCurrency: [...totals.entries()]
      .map(([currency, value]) => ({ currency, realizedPnl: value.toDecimalPlaces(20).toString() }))
      .sort((left, right) => left.currency.localeCompare(right.currency)),
    issues,
  };
}
