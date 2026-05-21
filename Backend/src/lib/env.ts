import 'dotenv/config';

/** Read an env var, allowing either UPPER_SNAKE or the alternate (mixed-case) name. */
function readEither(...names: string[]): string | undefined {
  for (const n of names) {
    const v = process.env[n];
    if (v && v.trim() !== '') return v.trim();
  }
  return undefined;
}

function required(name: string, alt?: string): string {
  const v = readEither(name, ...(alt ? [alt] : []));
  if (!v) throw new Error(`Missing required env var: ${name}${alt ? ` (or ${alt})` : ''}`);
  return v;
}

const corsOriginsRaw =
  process.env.CORS_ORIGIN ??
  'http://localhost:5173,http://localhost:5174,http://localhost:5175';
const corsOrigins = corsOriginsRaw
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

export const env = {
  mongodbUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  port: parseInt(process.env.PORT ?? '4000', 10),
  // Primary origin — used for redirect URLs (Stripe, Google OAuth callback)
  corsOrigin: corsOrigins[0] ?? 'http://localhost:5173',
  // Full allowlist — used to validate browser Origin headers
  corsOrigins,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  dbName: 'fitstake',

  // Payments
  stripeSecretKey: readEither('STRIPE_SECRET_KEY', 'Stripe_secret_key'),
  stripeWebhookSecret: readEither('STRIPE_WEBHOOK_SECRET', 'Stripe_webhook_secret'),
  razorpayKeyId: readEither('RAZORPAY_KEY_ID', 'Razorpay_key_id'),
  razorpayKeySecret: readEither('RAZORPAY_KEY_SECRET', 'Razorpay_key_secret'),

  // Google Fit OAuth
  googleClientId: readEither('GOOGLE_CLIENT_ID', 'Client_ID'),
  googleClientSecret: readEither('GOOGLE_CLIENT_SECRET', 'Client_Secret'),
  googleRedirectUri:
    readEither('GOOGLE_REDIRECT_URI') ?? 'http://localhost:4000/integrations/google-fit/callback',

  // Email (SMTP). All optional — if missing, mailer logs to console (dev mode).
  smtpHost: readEither('SMTP_HOST'),
  smtpPort: parseInt(readEither('SMTP_PORT') ?? '587', 10),
  smtpUser: readEither('SMTP_USER'),
  smtpPass: readEither('SMTP_PASS'),
  smtpFrom: readEither('SMTP_FROM') ?? 'FitStake <no-reply@fitstake.app>',
  /** Where the Support form ships user messages. Falls back to SMTP_USER. */
  supportInbox: readEither('SUPPORT_INBOX'),
};

export function smtpConfigured() {
  return !!(env.smtpHost && env.smtpUser && env.smtpPass);
}

export function paymentsAvailable() {
  return {
    razorpay: !!(env.razorpayKeyId && env.razorpayKeySecret),
    stripe: !!env.stripeSecretKey,
  };
}

export function googleFitConfigured() {
  return !!(env.googleClientId && env.googleClientSecret);
}
