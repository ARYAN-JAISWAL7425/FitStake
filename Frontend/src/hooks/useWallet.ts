import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

export type WalletTxn = {
  id: string;
  kind: 'deposit' | 'withdraw' | 'stake_lock' | 'stake_return' | 'stake_donate';
  title: string;
  subtitle: string;
  amount: string;
  positive: boolean;
};

export type WalletData = {
  balance: number;
  available: number;
  locked: number;
  transactions: WalletTxn[];
};

export function useWallet() {
  const [data, setData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!getToken()) return;
    setLoading(true);
    api
      .get<WalletData>('/wallet')
      .then((res) => setData(res))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useAppEvent('user-changed', refetch);
  useAppEvent('cycle-changed', refetch);

  return { data, loading, refetch };
}
