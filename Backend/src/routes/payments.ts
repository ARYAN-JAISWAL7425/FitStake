import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { env, paymentsAvailable } from '../lib/env';
import { createRazorpayOrder, verifyRazorpaySignature } from '../lib/payments/razorpay';
import {
  createStripeCheckoutSession,
  retrieveStripeSession,
} from '../lib/payments/stripe';
import { User, toUserDTO } from '../models/User';
import { Transaction } from '../models/Transaction';

const router = Router();

router.get('/status', (_req, res) => {
  res.json(paymentsAvailable());
});

/* ───────────────────────── Razorpay ───────────────────────── */

const rzpOrderSchema = z.object({
  amount: z.number().int().min(100).max(1000000),
});

router.post('/razorpay/order', requireAuth, async (req, res, next) => {
  try {
    if (!paymentsAvailable().razorpay) throw new HttpError(503, 'Razorpay not configured');
    const userId = req.auth!.sub;
    const { amount } = rzpOrderSchema.parse(req.body);
    // Razorpay caps receipt at 40 chars — keep this short.
    const receipt = `wlt_${userId.slice(-12)}_${Date.now()}`;
    const order = await createRazorpayOrder(amount, receipt);
    return res.json({
      orderId: order.id,
      keyId: env.razorpayKeyId, // public — safe to send
      amount,
      currency: 'INR',
    });
  } catch (err) {
    return next(err);
  }
});

const rzpVerifySchema = z.object({
  orderId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1),
  amount: z.number().int().min(100).max(1000000),
});

router.post('/razorpay/verify', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const { orderId, paymentId, signature, amount } = rzpVerifySchema.parse(req.body);

    const ok = verifyRazorpaySignature({ orderId, paymentId, signature });
    if (!ok) throw new HttpError(400, 'Signature verification failed');

    // Idempotency: if we've already credited this paymentId, return current state.
    const existing = await Transaction.findOne({ provider: 'razorpay', paymentRef: paymentId });
    if (existing) {
      const user = await User.findById(userId);
      return res.json({ already: true, user: user ? toUserDTO(user) : null });
    }

    await Transaction.create({
      userId,
      kind: 'deposit',
      amount,
      provider: 'razorpay',
      paymentRef: paymentId,
      note: `Order ${orderId}`,
    });
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: amount, available: amount } },
      { new: true }
    );

    return res.status(201).json({ already: false, user: user ? toUserDTO(user) : null });
  } catch (err) {
    return next(err);
  }
});

/* ───────────────────────── Stripe ───────────────────────── */

const stripeSessionSchema = z.object({
  amount: z.number().int().min(100).max(1000000),
});

router.post('/stripe/checkout-session', requireAuth, async (req, res, next) => {
  try {
    if (!paymentsAvailable().stripe) throw new HttpError(503, 'Stripe not configured');
    const userId = req.auth!.sub;
    const { amount } = stripeSessionSchema.parse(req.body);

    const session = await createStripeCheckoutSession({
      userId,
      amountInRupees: amount,
      successUrl: `${env.corsOrigin}/wallet?stripe_session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${env.corsOrigin}/wallet?stripe_cancelled=1`,
    });

    return res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    return next(err);
  }
});

/**
 * Demo-mode confirmation endpoint — when the user returns from Stripe Checkout the
 * frontend calls this with the session_id. We re-fetch the session from Stripe,
 * verify it was paid, and credit the wallet idempotently.
 *
 * In production this should be replaced by Stripe webhooks (POST /stripe/webhook
 * verifying with STRIPE_WEBHOOK_SECRET), but for local dev without `stripe listen`
 * this polling approach works.
 */
router.post('/stripe/confirm/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const sessionId = req.params.sessionId;

    const session = await retrieveStripeSession(sessionId);
    if (session.metadata?.userId !== userId) {
      throw new HttpError(403, 'Session does not belong to this user');
    }
    if (session.payment_status !== 'paid') {
      throw new HttpError(400, `Payment not completed (${session.payment_status})`);
    }

    const existing = await Transaction.findOne({ provider: 'stripe', paymentRef: sessionId });
    if (existing) {
      const user = await User.findById(userId);
      return res.json({ already: true, user: user ? toUserDTO(user) : null });
    }

    const amount = Math.round((session.amount_total ?? 0) / 100); // back to rupees
    if (amount <= 0) throw new HttpError(400, 'Invalid amount on session');

    await Transaction.create({
      userId,
      kind: 'deposit',
      amount,
      provider: 'stripe',
      paymentRef: sessionId,
      note: 'Stripe Checkout',
    });
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: amount, available: amount } },
      { new: true }
    );

    return res.status(201).json({ already: false, user: user ? toUserDTO(user) : null });
  } catch (err) {
    return next(err);
  }
});

export default router;
