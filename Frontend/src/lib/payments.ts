// Razorpay Checkout integration. Loads the script lazily, opens checkout, and resolves
// with the payment payload that the frontend then forwards to /payments/razorpay/verify.

import { api, ApiError } from './api';

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR not supported'));
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error('Failed to load Razorpay Checkout'));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

type RazorpaySuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type OpenOptions = {
  amount: number;
  userName?: string;
  userEmail?: string;
  onSuccess: (res: { paymentId: string; orderId: string; signature: string }) => void;
  onCancel?: () => void;
  onError?: (err: Error) => void;
};

/**
 * Opens Razorpay Checkout for `amount` rupees. Creates the order via our backend first.
 * Callbacks fire in the user's browser; the caller should still POST to /payments/razorpay/verify
 * with the returned IDs to actually credit the wallet.
 */
export async function openRazorpayCheckout(opts: OpenOptions) {
  await loadRazorpayScript();
  const order = await api.post<{ orderId: string; keyId: string; amount: number; currency: string }>(
    '/payments/razorpay/order',
    { amount: opts.amount }
  );

  const W = window as unknown as {
    Razorpay: new (config: Record<string, unknown>) => { open: () => void };
  };

  const checkout = new W.Razorpay({
    key: order.keyId,
    order_id: order.orderId,
    amount: order.amount * 100,
    currency: order.currency,
    name: 'FitStake',
    description: 'Wallet deposit',
    prefill: { name: opts.userName, email: opts.userEmail },
    theme: { color: '#1B3A28' },
    handler: (res: RazorpaySuccess) => {
      opts.onSuccess({
        paymentId: res.razorpay_payment_id,
        orderId: res.razorpay_order_id,
        signature: res.razorpay_signature,
      });
    },
    modal: {
      ondismiss: () => opts.onCancel?.(),
    },
  });
  checkout.open();
}

/** Calls our backend to verify the signature and credit the wallet. Returns updated user. */
export async function verifyRazorpayPayment(params: {
  orderId: string;
  paymentId: string;
  signature: string;
  amount: number;
}) {
  return api.post<{ already: boolean; user: { id: string; fp: number; walletBalance: number; available: number } | null }>(
    '/payments/razorpay/verify',
    params
  );
}

/** Starts a Stripe Checkout session and returns the URL to redirect to. */
export async function startStripeCheckout(amount: number) {
  return api.post<{ url: string; sessionId: string }>('/payments/stripe/checkout-session', { amount });
}

/** Called when the user lands back from Stripe Checkout with `?stripe_session_id=...`. */
export async function confirmStripeSession(sessionId: string) {
  return api.post<{ already: boolean; user: { id: string; fp: number; walletBalance: number; available: number } | null }>(
    `/payments/stripe/confirm/${sessionId}`
  );
}

export async function getPaymentProviders() {
  try {
    return await api.get<{ razorpay: boolean; stripe: boolean }>('/payments/status');
  } catch (err) {
    if (err instanceof ApiError) return { razorpay: false, stripe: false };
    return { razorpay: false, stripe: false };
  }
}
