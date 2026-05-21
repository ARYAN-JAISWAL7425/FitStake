// Returns the user's active cycle. Falls back to mock data when:
//   - no token is present (pre-auth demo)
//   - backend is unreachable
//   - user has no active cycle yet

import { useCallback, useEffect, useState } from 'react';
import { mockCycle, mockGoals } from '../data/mock';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

const EMPTY_CYCLE = {
  active: false as const,
  number: 0,
  day: 0,
  daysTotal: 30,
  threshold: 25,
  stake: 0,
  credited: 0,
  realMisses: 0,
  freezesUsed: 0,
  freezesStarting: 0,
  endDate: '—',
  daysLeft: 30,
  creditedNeeded: 25,
  goals: [] as ReturnType<typeof adaptGoal>[],
};

type ServerGoal = {
  id: string;
  templateId: 'steps' | 'strength' | 'water' | 'sleep' | 'diet' | 'cardio';
  title: string;
  target: number;
  unit: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  fpPerCompletion: number;
};

export type ServerCycle = {
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
  daysLeft: number;
  creditedNeeded: number;
  endDate: string;
  status: 'active' | 'completed' | 'missed' | 'cancelled';
  completedToday: string[];
  goals: ServerGoal[];
};

const iconKeyByTemplate: Record<ServerGoal['templateId'], string> = {
  steps: 'footprints',
  strength: 'dumbbell',
  water: 'droplet',
  sleep: 'moon',
  diet: 'apple',
  cardio: 'bike',
};

function adaptGoal(g: ServerGoal, doneIds: string[]) {
  const done = doneIds.includes(g.id);
  return {
    id: g.id,
    title: g.title,
    icon: iconKeyByTemplate[g.templateId],
    progress: done ? `Completed · +${g.fpPerCompletion} FP` : `Target: ${g.target} ${g.unit}`,
    done,
  };
}

export function useCycle() {
  const [cycle, setCycle] = useState<ServerCycle | null>(null);
  const [fetched, setFetched] = useState(false);

  const fetchCycle = useCallback(() => {
    if (!getToken()) return;
    api
      .get<{ cycle: ServerCycle | null }>('/cycles/current')
      .then((res) => {
        setCycle(res.cycle);
        setFetched(true);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
        setFetched(true);
      });
  }, []);

  useEffect(() => {
    fetchCycle();
  }, [fetchCycle]);

  useAppEvent('cycle-changed', fetchCycle);

  if (cycle) {
    return {
      active: true as const,
      number: cycle.number,
      day: cycle.day,
      daysTotal: cycle.daysTotal,
      threshold: cycle.threshold,
      stake: cycle.stake,
      credited: cycle.credited,
      realMisses: cycle.realMisses,
      freezesUsed: cycle.freezesUsed,
      freezesStarting: cycle.freezesStarting,
      endDate: cycle.endDate,
      daysLeft: cycle.daysLeft,
      creditedNeeded: cycle.creditedNeeded,
      goals: cycle.goals.map((g) => adaptGoal(g, cycle.completedToday)),
    };
  }

  // Authenticated (even mid-fetch) → never show mock; render empty state until
  // the real cycle arrives. Stops mock data from flashing on every navigation.
  if (getToken()) {
    return EMPTY_CYCLE;
  }
  // `fetched` kept above for callers that want to distinguish "no cycle" vs "loading";
  // not used in this render path but referenced to avoid an unused-state lint.
  void fetched;

  // Pre-auth demo path only.
  const cycleDaysLeft = mockCycle.daysTotal - mockCycle.day;
  const creditedNeeded = Math.max(mockCycle.threshold - mockCycle.credited, 0);
  return {
    active: true as const,
    ...mockCycle,
    daysLeft: cycleDaysLeft,
    creditedNeeded,
    goals: mockGoals,
  };
}

