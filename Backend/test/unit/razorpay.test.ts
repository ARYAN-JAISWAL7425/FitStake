import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';

const TEST_SECRET = 'test-rzp-secret-12345';

// Set the secret BEFORE importing the verifier (env is read at module load).
process.env.RAZORPAY_KEY_ID = 'rzp_test_dummy';
process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;

let verifyRazorpaySignature: (p: { orderId: string; paymentId: string; signature: string }) => boolean;

beforeAll(async () => {
  const mod = await import('../../src/lib/payments/razorpay');
  verifyRazorpaySignature = mod.verifyRazorpaySignature;
});

function signFor(orderId: string, paymentId: string): string {
  return crypto.createHmac('sha256', TEST_SECRET).update(`${orderId}|${paymentId}`).digest('hex');
}

describe('verifyRazorpaySignature', () => {
  it('accepts a correctly signed payload', () => {
    const sig = signFor('order_x', 'pay_y');
    expect(verifyRazorpaySignature({ orderId: 'order_x', paymentId: 'pay_y', signature: sig })).toBe(true);
  });

  it('rejects a signature signed with the wrong secret', () => {
    const wrongSig = crypto.createHmac('sha256', 'wrong-secret').update('order_x|pay_y').digest('hex');
    expect(verifyRazorpaySignature({ orderId: 'order_x', paymentId: 'pay_y', signature: wrongSig })).toBe(false);
  });

  it('rejects a tampered orderId', () => {
    const sig = signFor('order_x', 'pay_y');
    expect(verifyRazorpaySignature({ orderId: 'order_DIFFERENT', paymentId: 'pay_y', signature: sig })).toBe(false);
  });

  it('rejects a signature of the wrong length without throwing', () => {
    expect(verifyRazorpaySignature({ orderId: 'order_x', paymentId: 'pay_y', signature: 'too-short' })).toBe(false);
  });
});
