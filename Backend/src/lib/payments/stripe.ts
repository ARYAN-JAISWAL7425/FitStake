import Stripe from 'stripe';
import { env } from '../env';

let _client: Stripe | null = null;
function client(): Stripe {
  if (_client) return _client;
  if (!env.stripeSecretKey) throw new Error('Stripe secret key missing in env');
  _client = new Stripe(env.stripeSecretKey);
  return _client;
}

/**
 * Creates a Stripe Checkout Session for a wallet deposit. The user is redirected to
 * Stripe's hosted page; on success they come back to `${corsOrigin}/wallet?stripe_session_id=...`
 * and the frontend then calls /payments/stripe/confirm/:sessionId to credit the wallet.
 */
export async function createStripeCheckoutSession(params: {
  userId: string;
  amountInRupees: number;
  successUrl: string;
  cancelUrl: string;
}) {
  const session = await client().checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'inr',
          unit_amount: Math.round(params.amountInRupees * 100), // paise
          product_data: { name: 'FitStake wallet deposit' },
        },
        quantity: 1,
      },
    ],
    metadata: { userId: params.userId, kind: 'wallet_deposit' },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });
  return session;
}

export async function retrieveStripeSession(sessionId: string) {
  return client().checkout.sessions.retrieve(sessionId);
}

/** Verifies a Stripe webhook signature header. Used when STRIPE_WEBHOOK_SECRET is configured. */
export function constructStripeWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
  if (!env.stripeWebhookSecret) throw new Error('Stripe webhook secret missing');
  return client().webhooks.constructEvent(rawBody, signature, env.stripeWebhookSecret);
}
