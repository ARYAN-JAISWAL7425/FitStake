// Returns the currently signed-in user. Falls back to mock data when no token
// is present (lets the demo work without a backend / before login).
//
// When a token exists, this hook fetches /me on mount and refreshes the
// localStorage cache so the next render is instant from cache.

import { useCallback, useEffect, useState } from 'react';
import { mockUser } from '../data/mock';
import { api, ApiError } from '../lib/api';
import { getToken, getStoredUser, setStoredUser, clearAuth, AuthUser } from '../lib/auth';
import { useAppEvent } from '../lib/events';

export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(() => getStoredUser());

  const fetchUser = useCallback(() => {
    if (!getToken()) return;
    api
      .get<{ user: AuthUser }>('/me')
      .then((res) => {
        setUser(res.user);
        setStoredUser(res.user);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) {
          clearAuth();
          setUser(null);
        }
        // Network / 5xx errors: keep the cached/mock user; don't kill the UI.
      });
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useAppEvent('user-changed', fetchUser);

  // Authenticated: return live user with safe defaults for computed fields the
  // backend may not yet have populated (no mock leakage).
  if (user) {
    return {
      ...user,
      fpEarnedToday: user.fpEarnedToday ?? 0,
      fpToNextTier: user.fpToNextTier ?? 0,
      nextTier: user.nextTier ?? user.tier,
    };
  }

  // Token present but cached user missing (storage cleared, etc.) — render a
  // zeroed authenticated shell rather than mock, so we don't lie about the FP.
  if (getToken()) {
    return {
      id: 'pending',
      email: '',
      name: '…',
      initial: '·',
      tier: 'Bronze' as const,
      fp: 0,
      walletBalance: 0,
      available: 0,
      fpEarnedToday: 0,
      fpToNextTier: 1000,
      nextTier: 'Silver' as const,
    };
  }

  // Pre-auth demo path only — never reached once a token is present.
  return {
    id: 'mock',
    email: 'demo@fitstake.app',
    name: mockUser.name,
    initial: mockUser.initial,
    tier: mockUser.tier,
    fp: mockUser.fp,
    walletBalance: mockUser.walletBalance,
    available: mockUser.available,
    fpEarnedToday: mockUser.fpEarnedToday,
    fpToNextTier: mockUser.fpToNextTier,
    nextTier: mockUser.nextTier,
  };
}
