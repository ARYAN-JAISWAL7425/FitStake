import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { startTestDb, stopTestDb, clearAllCollections } from '../helpers';
import { Cycle } from '../../src/models/Cycle';
import { Completion } from '../../src/models/Completion';
import { applyFreezeAutoBurn } from '../../src/lib/freeze';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearAllCollections);

function dayMs(n: number) {
  return n * 24 * 60 * 60 * 1000;
}

async function makeCycle(daysAgo: number, opts: { freezesStarting: number; goals?: number }) {
  const goalCount = opts.goals ?? 2;
  const goals = Array.from({ length: goalCount }).map((_, i) => ({
    templateId: 'sleep' as const,
    title: `goal ${i + 1}`,
    target: 1,
    unit: 'h',
    difficulty: 'Easy' as const,
    fpPerCompletion: 30,
  }));
  return Cycle.create({
    userId: new mongoose.Types.ObjectId(),
    number: 1,
    stake: 500,
    startedAt: new Date(Date.now() - dayMs(daysAgo)),
    endsAt: new Date(Date.now() + dayMs(30 - daysAgo)),
    freezesStarting: opts.freezesStarting,
    freezesUsed: 0,
    credited: 0,
    goals,
  });
}

describe('applyFreezeAutoBurn', () => {
  it('does nothing on day 1 (no past days to burn for)', async () => {
    const cycle = await makeCycle(0, { freezesStarting: 3 });
    const { changed } = await applyFreezeAutoBurn(cycle);
    expect(changed).toBe(false);
    expect(cycle.freezesUsed).toBe(0);
    expect(cycle.credited).toBe(0);
  });

  it('burns one freeze per past missed day, up to the freeze budget', async () => {
    // Simulate "today is day 5" — 4 past days, none completed, 2 freezes available.
    const cycle = await makeCycle(4, { freezesStarting: 2 });
    const { changed } = await applyFreezeAutoBurn(cycle);
    expect(changed).toBe(true);
    expect(cycle.freezesUsed).toBe(2);
    expect(cycle.credited).toBe(2);
    expect(cycle.frozenDays.sort()).toEqual([1, 2]);
  });

  it('skips days that were fully completed', async () => {
    const cycle = await makeCycle(3, { freezesStarting: 3 }); // today is day 4
    // Complete BOTH goals on day 1 and day 2 — those should not be frozen.
    for (const day of [1, 2]) {
      for (const g of cycle.goals) {
        await Completion.create({
          userId: cycle.userId,
          cycleId: cycle._id,
          goalId: g._id!.toString(),
          day,
          fpAwarded: 30,
        });
      }
    }
    const { changed } = await applyFreezeAutoBurn(cycle);
    expect(changed).toBe(true);
    // Only day 3 is past+missed → 1 freeze burned.
    expect(cycle.freezesUsed).toBe(1);
    expect(cycle.frozenDays).toEqual([3]);
  });

  it('is idempotent — repeat calls do not re-burn', async () => {
    const cycle = await makeCycle(3, { freezesStarting: 5 });
    await applyFreezeAutoBurn(cycle);
    const usedAfterFirst = cycle.freezesUsed;
    const creditedAfterFirst = cycle.credited;
    const r = await applyFreezeAutoBurn(cycle);
    expect(r.changed).toBe(false);
    expect(cycle.freezesUsed).toBe(usedAfterFirst);
    expect(cycle.credited).toBe(creditedAfterFirst);
  });

  it('does nothing for non-active cycles', async () => {
    const cycle = await makeCycle(4, { freezesStarting: 3 });
    cycle.status = 'completed';
    await cycle.save();
    const { changed } = await applyFreezeAutoBurn(cycle);
    expect(changed).toBe(false);
    expect(cycle.freezesUsed).toBe(0);
  });
});
