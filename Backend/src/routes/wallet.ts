import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { User, toUserDTO } from '../models/User';
import { Transaction, toTxnDTO } from '../models/Transaction';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const user = await User.findById(userId);
    if (!user) throw new HttpError(404, 'User not found');
    const txns = await Transaction.find({ userId }).sort({ createdAt: -1 }).limit(20);
    return res.json({
      balance: user.walletBalance,
      available: user.available,
      locked: user.walletBalance - user.available,
      transactions: txns.map(toTxnDTO),
      user: toUserDTO(user),
    });
  } catch (err) {
    return next(err);
  }
});

const demoCreditSchema = z.object({
  amount: z.number().int().min(100).max(50000),
});

// DEMO ONLY — instant wallet credit, no payment gateway. Capped at ₹50k per call
// and rate-limited by the natural friction of needing to call it explicitly.
router.post('/demo-credit', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { amount } = demoCreditSchema.parse(req.body);
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: amount, available: amount } },
      { new: true }
    );
    if (!user) throw new HttpError(404, 'User not found');
    await Transaction.create({
      userId,
      kind: 'deposit',
      amount,
      provider: 'internal',
      note: 'Demo credit',
    });
    return res.json({ user: toUserDTO(user) });
  } catch (err) {
    return next(err);
  }
});

const withdrawSchema = z.object({
  amount: z.number().int().min(1).max(1000000),
});

router.post('/withdraw', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { amount } = withdrawSchema.parse(req.body);

    // Atomic conditional update — only succeeds if user has enough available.
    const user = await User.findOneAndUpdate(
      { _id: userId, available: { $gte: amount } },
      { $inc: { walletBalance: -amount, available: -amount } },
      { new: true }
    );
    if (!user) throw new HttpError(400, 'Insufficient available balance');

    await Transaction.create({
      userId,
      kind: 'withdraw',
      amount,
      provider: 'internal',
      note: 'Demo-mode withdrawal',
    });

    return res.json({ user: toUserDTO(user) });
  } catch (err) {
    return next(err);
  }
});

export default router;
