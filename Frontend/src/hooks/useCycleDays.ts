import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

export type DayStatus = 'done' | 'missed' | 'today' | 'upcoming' | 'freeze';
export type CycleDay = { day: number; status: DayStatus };

export type CycleDaysData = {
  days: CycleDay[];
  totalGoals: number;
  currentDay: number;
  freezesRemaining: number;
};

export function useCycleDays() {
  const [data, setData] = useState<CycleDaysData | null>(null);

  const refetch = useCallback(() => {
    if (!getToken()) {
      setData(null);
      return;
    }
    api
      .get<CycleDaysData>('/cycles/current/days')
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useAppEvent('cycle-changed', refetch);

  return { data, refetch };
}
