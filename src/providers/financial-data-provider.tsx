import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '@/providers/auth-provider';
import {
  loadFinancialSnapshotState,
  type SnapshotState,
} from '@/services/financial-repository';
import { buildPortfolioView, type PortfolioView } from '@/services/portfolio-view';

type FinancialDataContextValue = {
  snapshotState: SnapshotState;
  portfolio: PortfolioView | null;
  refresh(): Promise<void>;
};

const initialState: SnapshotState = { status: 'loading', data: null, isStale: false, error: null };
const FinancialDataContext = createContext<FinancialDataContextValue | null>(null);

export function FinancialDataProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [snapshotState, setSnapshotState] = useState<SnapshotState>(initialState);
  const requestGeneration = useRef(0);

  const refresh = useCallback(async () => {
    if (!user) {
      requestGeneration.current += 1;
      setSnapshotState(initialState);
      return;
    }
    const generation = ++requestGeneration.current;
    setSnapshotState((current) => ({ status: 'loading', data: current.data, isStale: current.isStale, error: null }));
    const next = await loadFinancialSnapshotState(snapshotState.data);
    if (generation === requestGeneration.current) setSnapshotState(next);
  }, [snapshotState.data, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const generation = ++requestGeneration.current;
    void loadFinancialSnapshotState(null).then((next) => {
      if (cancelled || generation !== requestGeneration.current) return;
      setSnapshotState(next);
    });
    return () => { cancelled = true; requestGeneration.current += 1; };
  }, [user]);

  const portfolio = useMemo(
    () => snapshotState.data ? buildPortfolioView(snapshotState.data) : null,
    [snapshotState.data],
  );

  const value = useMemo(() => ({ snapshotState, portfolio, refresh }), [portfolio, refresh, snapshotState]);
  return <FinancialDataContext.Provider value={value}>{children}</FinancialDataContext.Provider>;
}

export function useFinancialData() {
  const value = useContext(FinancialDataContext);
  if (!value) throw new Error('useFinancialData must be used inside FinancialDataProvider');
  return value;
}
