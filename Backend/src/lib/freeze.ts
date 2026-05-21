// Lazy freeze auto-burn.
//
// For each past day (strictly before today) where the user FAILED to complete all
// goals AND hasn't already been frozen, consume one freeze and mark that day as
// frozen. The day then counts toward the cycle's credited total.
//
// Called from every read/write path that could surface day status — keeps the
// rule consistent without a background cron.

import { Cycle, CycleDoc, currentDayOf } from '../models/Cycle';
import { Completion } from '../models/Completion';

export async function applyFreezeAutoBurn(cycle: CycleDoc): Promise<{ changed: boolean }> {
  if (cycle.status !== 'active') return { changed: false };

  const goalCount = cycle.goals.length;
  if (goalCount === 0) return { changed: false };

  const today = currentDayOf(cycle);
  // Only act on strictly past days.
  if (today <= 1) return { changed: false };

  // Build map of day → completed-goal-count from this cycle's Completions.
  const completions = await Completion.find({ cycleId: cycle._id }).select('day').lean();
  const completedByDay = new Map<number, number>();
  for (const c of completions) {
    completedByDay.set(c.day, (completedByDay.get(c.day) ?? 0) + 1);
  }

  let changed = false;
  for (let d = 1; d < today; d++) {
    const fullyComplete = (completedByDay.get(d) ?? 0) >= goalCount;
    if (fullyComplete) continue; // already credited or will be on tap
    if (cycle.frozenDays.includes(d)) continue; // already frozen

    const freezesLeft = cycle.freezesStarting - cycle.freezesUsed;
    if (freezesLeft <= 0) break;

    cycle.frozenDays.push(d);
    cycle.freezesUsed += 1;
    cycle.credited += 1;
    changed = true;
  }

  if (changed) await cycle.save();
  return { changed };
}

/** Loads the active cycle (if any) and applies auto-burn. Returns the (possibly mutated) cycle. */
export async function loadActiveCycleWithFreezeBurn(userId: string): Promise<CycleDoc | null> {
  const cycle = await Cycle.findOne({ userId, status: 'active' });
  if (!cycle) return null;
  await applyFreezeAutoBurn(cycle);
  return cycle;
}
