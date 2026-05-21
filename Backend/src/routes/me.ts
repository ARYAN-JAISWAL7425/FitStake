import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { User, toUserDTO } from '../models/User';
import { Cycle, currentDayOf } from '../models/Cycle';
import { Completion } from '../models/Completion';
import { Transaction } from '../models/Transaction';
import { HttpError } from '../middleware/error';
import { TIER_FLOOR, nextTierOf, tierForFp, Tier } from '../lib/tier';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, 'User not found');

    // Sum FP earned today in the active cycle.
    let fpEarnedToday = 0;
    const active = await Cycle.findOne({ userId, status: 'active' });
    if (active) {
      const day = currentDayOf(active);
      if (day >= 1) {
        const agg = await Completion.aggregate<{ total: number }>([
          { $match: { userId: active.userId, cycleId: active._id, day } },
          { $group: { _id: null, total: { $sum: '$fpAwarded' } } },
        ]);
        fpEarnedToday = agg[0]?.total ?? 0;
      }
    }

    // Self-heal: if a user's stored tier is below what their FP earns, fix it.
    const earned = tierForFp(user.fp);
    if (earned !== user.tier) {
      user.tier = earned;
      await user.save();
    }
    const tier = (user.tier as Tier) ?? 'Bronze';
    const next = nextTierOf(tier);
    const fpToNextTier = next ? Math.max(0, TIER_FLOOR[next] - user.fp) : 0;

    // Lifetime stats — drives the Profile page's three-stat row.
    const [earnedBackAgg, donatedAgg, cyclesDone] = await Promise.all([
      Transaction.aggregate<{ total: number }>([
        { $match: { userId: user._id, kind: 'stake_return' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Transaction.aggregate<{ total: number }>([
        { $match: { userId: user._id, kind: 'stake_donate' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Cycle.countDocuments({ userId: user._id, status: { $in: ['completed', 'missed'] } }),
    ]);
    const lifetime = {
      earnedBack: earnedBackAgg[0]?.total ?? 0,
      cyclesDone,
      donatedToCharity: donatedAgg[0]?.total ?? 0,
    };

    return res.json({
      user: {
        ...toUserDTO(user),
        fpEarnedToday,
        fpToNextTier,
        nextTier: next ?? tier,
        lifetime,
      },
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
