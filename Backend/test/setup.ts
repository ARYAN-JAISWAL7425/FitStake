// Runs before each test file. We set env vars BEFORE any app code is imported,
// so `lib/env.ts`'s `required()` calls pass and no real .env values leak in.
process.env.JWT_SECRET = 'test-secret-do-not-use-in-prod';
process.env.MONGODB_URI = 'mongodb://placeholder-will-be-replaced'; // overridden per-test via mongoose.connect
process.env.CORS_ORIGIN = 'http://localhost:5173';
// Force payment providers off so tests don't need real keys.
delete process.env.STRIPE_SECRET_KEY;
delete process.env.Stripe_secret_key;
delete process.env.RAZORPAY_KEY_ID;
delete process.env.Razorpay_key_id;
delete process.env.RAZORPAY_KEY_SECRET;
delete process.env.Razorpay_key_secret;
