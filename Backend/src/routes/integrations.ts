import { Router } from 'express';
import crypto from 'crypto';
import { requireAuth } from '../middleware/auth';
import { HttpError } from '../middleware/error';
import { env, googleFitConfigured } from '../lib/env';
import { signToken, verifyToken } from '../lib/jwt';
import {
  buildAuthUrl,
  exchangeAuthCode,
  findIntegration,
  getStepsForToday,
  getValidAccessToken,
  revokeToken,
} from '../lib/googleFit';
import { HealthIntegration } from '../models/HealthIntegration';

const router = Router();

router.get('/status', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const integration = await findIntegration(userId);
    return res.json({
      configured: googleFitConfigured(),
      providers: {
        'google-fit': {
          connected: !!integration,
          scope: integration?.scope ?? '',
          connectedAt: integration?.createdAt ?? null,
        },
      },
    });
  } catch (err) {
    return next(err);
  }
});

/**
 * Issues the URL the frontend opens in a popup/new-tab so the user can consent.
 * We embed a short-lived JWT in `state` so the callback can prove which user
 * initiated the flow (the callback is unauthenticated — Google calls it).
 */
router.get('/google-fit/auth-url', requireAuth, async (req, res, next) => {
  try {
    if (!googleFitConfigured()) throw new HttpError(503, 'Google Fit not configured');
    const userId = req.auth!.sub;
    const nonce = crypto.randomBytes(8).toString('hex');
    // 10-minute state token. Re-uses the same secret as our app JWT.
    const state = signToken({ sub: userId, email: `state:${nonce}` });
    const url = buildAuthUrl(state);
    return res.json({ url });
  } catch (err) {
    return next(err);
  }
});

/**
 * Google redirects the user here after consent. Unauthenticated (no Bearer header
 * — it's a browser GET); we use the `state` JWT to identify the user.
 */
router.get('/google-fit/callback', async (req, res, next) => {
  try {
    const { code, state, error } = req.query as { code?: string; state?: string; error?: string };
    const frontendBase = env.corsOrigin;

    if (error) {
      return res.redirect(`${frontendBase}/profile?google_fit=error&reason=${encodeURIComponent(error)}`);
    }
    if (!code || !state) {
      return res.redirect(`${frontendBase}/profile?google_fit=error&reason=missing_code_or_state`);
    }

    let userId: string;
    try {
      userId = verifyToken(state).sub;
    } catch {
      return res.redirect(`${frontendBase}/profile?google_fit=error&reason=invalid_state`);
    }

    const tokens = await exchangeAuthCode(code);

    await HealthIntegration.findOneAndUpdate(
      { userId, provider: 'google-fit' },
      {
        accessToken: tokens.access_token,
        // Only overwrite refreshToken if Google returned a new one.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
      { upsert: true, new: true }
    );

    return res.redirect(`${frontendBase}/profile?google_fit=connected`);
  } catch (err) {
    console.error('[google-fit/callback]', err);
    const frontendBase = env.corsOrigin;
    return res.redirect(`${frontendBase}/profile?google_fit=error&reason=server_error`);
  }
});

/** On-demand fetch: returns today's step count from Google Fit. */
router.post('/google-fit/sync', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const integration = await findIntegration(userId);
    if (!integration) throw new HttpError(400, 'Google Fit not connected');
    const accessToken = await getValidAccessToken(integration);
    const steps = await getStepsForToday(accessToken);
    return res.json({ provider: 'google-fit', steps, fetchedAt: new Date() });
  } catch (err) {
    return next(err);
  }
});

router.delete('/google-fit', requireAuth, async (req, res, next) => {
  try {
    const userId = req.auth!.sub;
    const integration = await findIntegration(userId);
    if (integration) {
      // Best-effort revoke.
      if (integration.refreshToken) await revokeToken(integration.refreshToken);
      await HealthIntegration.deleteOne({ _id: integration._id });
    }
    return res.json({ ok: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
