// Tier rules — keep in sync with /me's TIER_FLOOR and FITSTAKE.md.
export const TIER_ORDER = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;
export type Tier = (typeof TIER_ORDER)[number];

export const TIER_FLOOR: Record<Tier, number> = {
  Bronze: 0,
  Silver: 1000,
  Gold: 5000,
  Platinum: 20000,
};

/** Highest tier the given FP qualifies for. */
export function tierForFp(fp: number): Tier {
  let earned: Tier = 'Bronze';
  for (const t of TIER_ORDER) {
    if (fp >= TIER_FLOOR[t]) earned = t;
  }
  return earned;
}

/** Returns the next tier above current, or null if already at top. */
export function nextTierOf(t: Tier): Tier | null {
  const i = TIER_ORDER.indexOf(t);
  return i < TIER_ORDER.length - 1 ? TIER_ORDER[i + 1] : null;
}
