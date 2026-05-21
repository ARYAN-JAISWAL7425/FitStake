import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import {
  Cycle,
  toCycleDTO,
  currentDayOf,
  difficultyFor,
  fpFor,
  freezesForStake,
  TEMPLATE_IDS,
} from '../models/Cycle';
import { Completion } from '../models/Completion';
import { User, toUserDTO } from '../models/User';
import { Transaction } from '../models/Transaction';
import { tierForFp } from '../lib/tier';
import { applyFreezeAutoBurn } from '../lib/freeze';

const router = Router();

const goalInputSchema = z.object({
  templateId: z.enum(TEMPLATE_IDS),
  title: z.string().trim().min(1),
  target: z.number().positive(),
  unit: z.string().trim().min(1),
});

const createCycleSchema = z.object({
  stake: z.number().int().min(100).max(10000),
  goals: z.array(goalInputSchema).min(1).max(8),
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    // One active cycle at a time.
    const active = await Cycle.findOne({ userId, status: 'active' });
    if (active) throw new HttpError(409, 'You already have an active cycle');

    const { stake, goals } = createCycleSchema.parse(req.body);

    // Atomic lock: deduct `stake` from `available` only if user has enough.
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, available: { $gte: stake } },
      { $inc: { available: -stake } },
      { new: true }
    );
    if (!updatedUser) {
      throw new HttpError(
        400,
        'Insufficient available balance. Top up your wallet before starting a cycle.'
      );
    }

    const lastCycle = await Cycle.findOne({ userId }).sort({ number: -1 });
    const number = (lastCycle?.number ?? 0) + 1;

    const startedAt = new Date();
    const endsAt = new Date(startedAt.getTime() + 30 * 24 * 60 * 60 * 1000);

    const enrichedGoals = goals.map((g) => {
      const difficulty = difficultyFor(g.templateId, g.target);
      return {
        templateId: g.templateId,
        title: g.title,
        target: g.target,
        unit: g.unit,
        difficulty,
        fpPerCompletion: fpFor(g.templateId, g.target),
      };
    });

    let cycle;
    try {
      cycle = await Cycle.create({
        userId,
        number,
        stake,
        startedAt,
        endsAt,
        freezesStarting: freezesForStake(stake),
        goals: enrichedGoals,
      });
    } catch (createErr) {
      // Roll the lock back if cycle creation fails.
      await User.findOneAndUpdate({ _id: userId }, { $inc: { available: stake } });
      throw createErr;
    }

    await Transaction.create({
      userId,
      kind: 'stake_lock',
      amount: stake,
      provider: 'internal',
      cycleId: cycle._id,
      note: `Cycle ${number} locked`,
    });

    return res.status(201).json({
      cycle: toCycleDTO(cycle),
      user: toUserDTO(updatedUser),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/current', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    // Active cycle takes priority. Otherwise return the most recently resolved one
    // so CycleComplete / Missed screens can read it.
    let cycle = await Cycle.findOne({ userId, status: 'active' });
    if (cycle) await applyFreezeAutoBurn(cycle);
    if (!cycle) {
      cycle = await Cycle.findOne({ userId, status: { $in: ['completed', 'missed'] } }).sort({ updatedAt: -1 });
    }
    if (!cycle) return res.json({ cycle: null });
    const day = currentDayOf(cycle);
    const completedToday = await Completion.find({ cycleId: cycle._id, day }).distinct('goalId');
    return res.json({ cycle: toCycleDTO(cycle, completedToday) });
  } catch (err) {
    return next(err);
  }
});

/** Per-day status for the active cycle (or most recent resolved one). */
router.get('/current/days', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    let cycle = await Cycle.findOne({ userId, status: 'active' });
    if (cycle) await applyFreezeAutoBurn(cycle);
    if (!cycle) {
      cycle = await Cycle.findOne({ userId, status: { $in: ['completed', 'missed'] } }).sort({ updatedAt: -1 });
    }
    if (!cycle) return res.json({ days: [], totalGoals: 0, currentDay: 0 });

    const goalCount = cycle.goals.length;
    const today = currentDayOf(cycle);
    const frozen = new Set<number>(cycle.frozenDays ?? []);

    // Pull all completions for the cycle and group by day.
    const completions = await Completion.find({ cycleId: cycle._id }).select('day').lean();
    const byDay = new Map<number, number>();
    for (const c of completions) {
      byDay.set(c.day, (byDay.get(c.day) ?? 0) + 1);
    }

    const days: Array<{ day: number; status: 'done' | 'missed' | 'today' | 'upcoming' | 'freeze' }> = [];
    for (let d = 1; d <= cycle.daysTotal; d++) {
      if (d > today) {
        days.push({ day: d, status: 'upcoming' });
      } else {
        const allDone = goalCount > 0 && (byDay.get(d) ?? 0) >= goalCount;
        if (allDone) days.push({ day: d, status: 'done' });
        else if (frozen.has(d)) days.push({ day: d, status: 'freeze' });
        else if (d === today) days.push({ day: d, status: 'today' });
        else days.push({ day: d, status: 'missed' });
      }
    }
    return res.json({ days, totalGoals: goalCount, currentDay: today, freezesRemaining: Math.max(0, cycle.freezesStarting - cycle.freezesUsed) });
  } catch (err) {
    return next(err);
  }
});

router.get('/recent', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const cycle = await Cycle.findOne({ userId, status: { $in: ['completed', 'missed'] } })
      .sort({ updatedAt: -1 });
    if (!cycle) return res.json({ cycle: null });
    const completedToday = await Completion.find({ cycleId: cycle._id }).distinct('goalId');
    return res.json({ cycle: toCycleDTO(cycle, completedToday) });
  } catch (err) {
    return next(err);
  }
});

/**
 * Resolves the user's active cycle.
 *
 * Body:
 *   { simulate: 'win' | 'miss' }  — demo override (works any time)
 *   {}                            — real resolution (only allowed when day >= 30)
 *
 * Win  → status='completed', stake_return Transaction, user.available += stake,
 *        FP bonus = 500 + 20 × credited.
 * Miss → status='missed',    stake_donate Transaction, user.walletBalance -= stake,
 *        FP bonus = 15 × credited (failure_effort).
 */
const resolveSchema = z.object({ simulate: z.enum(['win', 'miss']).optional() });

router.post('/current/resolve', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { simulate } = resolveSchema.parse(req.body ?? {});

    const cycle = await Cycle.findOne({ userId, status: 'active' });
    if (!cycle) throw new HttpError(400, 'No active cycle to resolve');

    const day = currentDayOf(cycle);
    const isRealResolution = day >= cycle.daysTotal;

    if (!simulate && !isRealResolution) {
      throw new HttpError(
        400,
        `Cycle not eligible for resolution yet (day ${day} of ${cycle.daysTotal}). Use { simulate: 'win' | 'miss' } for demo.`
      );
    }

    const won = simulate === 'win' ? true : simulate === 'miss' ? false : cycle.credited >= cycle.threshold;

    // Compute FP bonuses.
    const completionBonusFp = won ? 500 + 20 * cycle.credited : 15 * cycle.credited;
    const fpSource = won ? 'cycle_complete' : 'failure_effort';

    // Update wallet atomically per outcome.
    let user;
    if (won) {
      // Unlock the stake back to available.
      user = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { available: cycle.stake, fp: completionBonusFp } },
        { new: true }
      );
    } else {
      // Stake leaves the wallet entirely (to charity). Available was already debited
      // at cycle start, so only walletBalance moves here.
      user = await User.findOneAndUpdate(
        { _id: userId },
        { $inc: { walletBalance: -cycle.stake, fp: completionBonusFp } },
        { new: true }
      );
    }

    // Record the ledger movements. Missed cycles tag GiveIndia as the recipient and
    // mark the payout as pending — the actual transfer is a manual monthly export
    // (no public GiveIndia donation API for arbitrary apps).
    await Transaction.create({
      userId,
      kind: won ? 'stake_return' : 'stake_donate',
      amount: cycle.stake,
      provider: 'internal',
      cycleId: cycle._id,
      note: won ? `Cycle ${cycle.number} complete (${cycle.credited}/${cycle.threshold})` : `Cycle ${cycle.number} missed (${cycle.credited}/${cycle.threshold})`,
      charity: won ? null : 'GiveIndia',
      payoutStatus: won ? null : 'pending',
    });

    if (completionBonusFp > 0) {
      // Lazy import to avoid circular dep.
      const { FpEvent } = await import('../models/FpEvent');
      await FpEvent.create({
        userId,
        cycleId: cycle._id,
        source: fpSource,
        amount: completionBonusFp,
      });
    }

    cycle.status = won ? 'completed' : 'missed';
    await cycle.save();

    // Tier auto-promotion based on cumulative FP.
    if (user) {
      const earnedTier = tierForFp(user.fp ?? 0);
      if (earnedTier !== user.tier) {
        user.tier = earnedTier;
        await user.save();
      }
    }

    const completedAll = await Completion.find({ cycleId: cycle._id }).distinct('goalId');
    return res.json({
      outcome: won ? 'win' : 'miss',
      bonusFp: completionBonusFp,
      simulated: !!simulate,
      cycle: toCycleDTO(cycle, completedAll),
      user: user ? toUserDTO(user) : null,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
