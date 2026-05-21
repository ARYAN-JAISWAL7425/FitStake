import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { User, toUserDTO } from '../models/User';
import {
  Redemption,
  toRedemptionDTO,
  generateRedemptionCode,
} from '../models/Redemption';
import { FpEvent } from '../models/FpEvent';
import {
  coupons,
  storeItems,
  tierBenefits,
  findCoupon,
  findStoreItem,
  userMeetsTier,
  Tier,
} from '../data/rewards';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, 'User not found');
    return res.json({
      coupons,
      storeItems,
      perks: tierBenefits[user.tier as Tier],
      couponsCount: coupons.length,
      storeCount: storeItems.length,
      userFp: user.fp,
      userTier: user.tier,
    });
  } catch (err) {
    return next(err);
  }
});

const redeemSchema = z.object({
  kind: z.enum(['coupon', 'store']),
  itemId: z.string().min(1),
});

router.post('/redeem', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { kind, itemId } = redeemSchema.parse(req.body);

    // Look up the item from the catalog.
    const item = kind === 'coupon' ? findCoupon(itemId) : findStoreItem(itemId);
    if (!item) throw new HttpError(404, 'Item not found');

    // Tier gate (store items only).
    if (kind === 'store') {
      const storeItem = item as ReturnType<typeof findStoreItem>;
      if (storeItem?.locked && storeItem.unlockTier) {
        const user = await User.findById(userId);
        if (!user || !userMeetsTier(user.tier as Tier, storeItem.unlockTier)) {
          throw new HttpError(403, `Requires ${storeItem.unlockTier} tier`);
        }
      }
    }

    const cost = item.cost;

    // Atomically deduct FP only if user has enough.
    const updatedUser = await User.findOneAndUpdate(
      { _id: userId, fp: { $gte: cost } },
      { $inc: { fp: -cost } },
      { new: true }
    );
    if (!updatedUser) throw new HttpError(400, 'Not enough FP');

    let redemption;
    try {
      redemption = await Redemption.create({
        userId,
        kind,
        itemId,
        title: kind === 'coupon' ? `${(item as { brand: string }).brand} · ${(item as { offer: string }).offer}` : (item as { title: string }).title,
        fpCost: cost,
        code: generateRedemptionCode(),
      });
    } catch (createErr) {
      // Roll FP back if the redemption row couldn't be written.
      await User.findOneAndUpdate({ _id: userId }, { $inc: { fp: cost } });
      throw createErr;
    }

    // Negative FP ledger event (spent on redemption).
    await FpEvent.create({
      userId,
      source: 'redemption',
      amount: -cost,
    }).catch(() => {/* ledger is informational; ignore write errors */});

    return res.status(201).json({
      redemption: toRedemptionDTO(redemption),
      user: toUserDTO(updatedUser),
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/redemptions', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const list = await Redemption.find({ userId }).sort({ createdAt: -1 }).limit(20);
    return res.json({ redemptions: list.map(toRedemptionDTO) });
  } catch (err) {
    return next(err);
  }
});

export default router;
