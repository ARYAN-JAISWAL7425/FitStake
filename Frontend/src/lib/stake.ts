// Tiny localStorage-backed stake store. SWAP-POINT: replace with real cycle-config API.

const KEY = 'fitstake.stake';
const DEFAULT_STAKE = 2000;
export const STAKE_MIN = 100;
export const STAKE_MAX = 10000;

export function getStake(): number {
  if (typeof window === 'undefined') return DEFAULT_STAKE;
  const raw = window.localStorage.getItem(KEY);
  const n = raw ? parseInt(raw, 10) : NaN;
  if (Number.isNaN(n) || n < STAKE_MIN || n > STAKE_MAX) return DEFAULT_STAKE;
  return n;
}

export function setStake(n: number) {
  const clamped = Math.max(STAKE_MIN, Math.min(STAKE_MAX, Math.round(n)));
  window.localStorage.setItem(KEY, String(clamped));
}

export function freezesForStake(stake: number): number {
  if (stake >= 5000) return 4;
  if (stake >= 1000) return 3;
  return 2;
}
