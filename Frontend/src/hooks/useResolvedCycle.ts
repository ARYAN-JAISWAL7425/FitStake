// Fetches the most recently resolved cycle (completed or missed). Used by the
// CycleComplete and Missed screens to display real numbers.

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

export type ResolvedCycle = {
  id: string;
  number: number;
  day: number;
  daysTotal: number;
  threshold: number;
  stake: number;
  credited: number;
  realMisses: number;
  freezesUsed: number;
  freezesStarting: number;
  endDate: string;
  status: 'completed' | 'missed' | 'active' | 'cancelled';
  goals: { id: string; templateId: string; title: string; target: number; unit: string; difficulty: string; fpPerCompletion: number }[];
};

export function useResolvedCycle() {
  const [cycle, setCycle] = useState<ResolvedCycle | null>(null);

  const refetch = useCallback(() => {
    if (!getToken()) return;
    api
      .get<{ cycle: ResolvedCycle | null }>('/cycles/recent')
      .then((res) => setCycle(res.cycle))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useAppEvent('cycle-changed', refetch);
  return cycle;
}
