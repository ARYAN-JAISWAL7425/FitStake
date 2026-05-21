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
  status: 'active' as const,
  id: '',
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
  proofKind?: 'auto-steps' | 'photo' | 'tap' | null;
  verifiedSteps?: number | null;
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
  let progress: string;
  if (done) {
    // Surface HOW it was verified so the user can tell the system actually checked.
    if (g.proofKind === 'auto-steps' && g.verifiedSteps != null) {
      progress = `Verified by Google Fit · ${g.verifiedSteps.toLocaleString('en-IN')} steps · +${g.fpPerCompletion} FP`;
    } else if (g.proofKind === 'photo') {
      progress = `Verified by photo proof · +${g.fpPerCompletion} FP`;
    } else {
      progress = `Completed · +${g.fpPerCompletion} FP`;
    }
  } else {
    progress = `Target: ${g.target} ${g.unit}`;
  }
  return {
    id: g.id,
    title: g.title,
    icon: iconKeyByTemplate[g.templateId],
    templateId: g.templateId,
    progress,
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
    // `active` reflects whether there's a cycle the user is currently DOING.
    // Resolved cycles (completed/missed) hang around in /cycles/current so the
    // outcome screens can read them, but Home should treat them as "no cycle".
    const isActive = cycle.status === 'active';
    return {
      active: isActive,
      status: cycle.status,
      id: cycle.id,
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
    status: 'active' as const,
    id: 'mock-cycle',
    ...mockCycle,
    daysLeft: cycleDaysLeft,
    creditedNeeded,
    goals: mockGoals,
  };
}

