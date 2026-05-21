import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../env';

let _client: Razorpay | null = null;
function client(): Razorpay {
  if (_client) return _client;
  if (!env.razorpayKeyId || !env.razorpayKeySecret) {
    throw new Error('Razorpay keys missing in env');
  }
  _client = new Razorpay({
    key_id: env.razorpayKeyId,
    key_secret: env.razorpayKeySecret,
  });
  return _client;
}

/** Creates a Razorpay order for `amount` rupees. Returns the order so frontend can launch checkout. */
export async function createRazorpayOrder(amountInRupees: number, receipt: string) {
  const order = await client().orders.create({
    amount: Math.round(amountInRupees * 100), // paise
    currency: 'INR',
    receipt,
    // payment_capture is auto on test mode
  });
  return order;
}

/**
 * Verifies Razorpay checkout signature.
 * Per Razorpay docs:
 *   expected = HMAC_SHA256(`${order_id}|${payment_id}`, key_secret)
 *   compare to razorpay_signature
 */
export function verifyRazorpaySignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  if (!env.razorpayKeySecret) return false;
  const expected = crypto
    .createHmac('sha256', env.razorpayKeySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');
  // Constant-time compare.
  const a = Buffer.from(expected);
  const b = Buffer.from(params.signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
