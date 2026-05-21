import { useCallback, useEffect, useState } from 'react';
import { mockSquad, mockSquadStats } from '../data/mock';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

export type SquadMember = {
  id: string;
  name: string;
  initial: string;
  color: string;
  pct: number;
  trend: 'up' | 'flat' | 'down';
  trendValue: number;
  atRisk?: boolean;
  isYou?: boolean;
};

export type SquadData = {
  id: string;
  name: string;
  code: string;
  ownerId: string;
  cycleLabel: string;
  squadAvg: number;
  topStreak: number;
  members: SquadMember[];
};

export function useSquad() {
  const [squads, setSquads] = useState<SquadData[] | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!getToken()) return;
    setLoading(true);
    api
      .get<{ squads: SquadData[]; squad: SquadData | null }>('/squads/mine')
      .then((res) => setSquads(res.squads ?? []))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { refetch(); }, [refetch]);
  useAppEvent('cycle-changed', refetch);
  useAppEvent('user-changed', refetch);

  const create = async (name: string) => {
    const res = await api.post<{ squad: SquadData }>('/squads', { name });
    refetch();
    return res.squad;
  };

  const join = async (code: string) => {
    const res = await api.post<{ already: boolean; squad: SquadData }>('/squads/join', { code });
    refetch();
    return res;
  };

  const leave = async (squadId: string) => {
    await api.post(`/squads/${squadId}/leave`);
    refetch();
  };

  const primary = squads && squads.length > 0 ? squads[0] : null;

  if (primary) {
    return {
      squads,
      squad: primary.members,
      stats: {
        name: primary.name,
        cycleLabel: primary.cycleLabel,
        squadAvg: primary.squadAvg,
        topStreak: primary.topStreak,
        members: primary.members.length,
      },
      primary,
      create,
      join,
      leave,
      loading,
      refetch,
    };
  }

  // Authenticated but no squads → empty arrays + actions, never mock.
  if (getToken()) {
    return {
      squads: [],
      squad: [] as typeof mockSquad,
      stats: { name: '', cycleLabel: '', squadAvg: 0, topStreak: 0, members: 0 },
      primary: null,
      create,
      join,
      leave,
      loading,
      refetch,
    };
  }

  // Pre-auth demo only.
  return {
    squads: null,
    squad: mockSquad,
    stats: mockSquadStats,
    primary: null,
    create,
    join,
    leave,
    loading: false,
    refetch,
  };
}
