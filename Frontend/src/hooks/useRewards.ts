import { useCallback, useEffect, useState } from 'react';
import { mockCoupons, mockStoreItems, mockTierBenefits, mockUser } from '../data/mock';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

type RewardsPayload = {
  coupons: typeof mockCoupons;
  storeItems: typeof mockStoreItems;
  perks: string[];
  couponsCount: number;
  storeCount: number;
  userFp: number;
  userTier: keyof typeof mockTierBenefits;
};

export function useRewards() {
  const [data, setData] = useState<RewardsPayload | null>(null);

  const refetch = useCallback(() => {
    if (!getToken()) return;
    api
      .get<RewardsPayload>('/rewards')
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
      });
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useAppEvent('user-changed', refetch);

  if (data) {
    return {
      coupons: data.coupons,
      storeItems: data.storeItems,
      couponsCount: data.couponsCount,
      storeCount: data.storeCount,
      perks: data.perks,
    };
  }

  // Authenticated but still loading: return empty arrays so the UI doesn't
  // flash mock catalog before the real fetch resolves.
  if (getToken()) {
    return {
      coupons: [] as typeof mockCoupons,
      storeItems: [] as typeof mockStoreItems,
      couponsCount: 0,
      storeCount: 0,
      perks: [] as string[],
    };
  }

  // Pre-auth demo only.
  return {
    coupons: mockCoupons,
    storeItems: mockStoreItems,
    couponsCount: mockCoupons.length,
    storeCount: mockStoreItems.length,
    perks: mockTierBenefits[mockUser.tier],
  };
}
