// Tiny JWT + user store backed by localStorage. SWAP-POINT for fancier auth later (e.g. refresh tokens).

const TOKEN_KEY = 'fitstake.token';
const USER_KEY = 'fitstake.user';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  initial: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  fp: number;
  walletBalance: number;
  available: number;
  fpEarnedToday?: number;
  fpToNextTier?: number;
  nextTier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  lifetime?: {
    earnedBack: number;
    cyclesDone: number;
    donatedToCharity: number;
  };
};

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(t: string) {
  window.localStorage.setItem(TOKEN_KEY, t);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setStoredUser(u: AuthUser) {
  window.localStorage.setItem(USER_KEY, JSON.stringify(u));
}

export function clearAuth() {
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
