// Thin wrapper over Google Fit REST APIs. Uses the global `fetch` (Node 18+).

import { env } from './env';
import { HealthIntegration, HealthIntegrationDoc } from '../models/HealthIntegration';

export const GOOGLE_FIT_SCOPES = ['https://www.googleapis.com/auth/fitness.activity.read'].join(' ');

/** Builds the URL we send the user to so they can consent. */
export function buildAuthUrl(state: string): string {
  if (!env.googleClientId) throw new Error('Google client id missing');
  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: GOOGLE_FIT_SCOPES,
    access_type: 'offline', // gets a refresh_token
    prompt: 'consent', // forces re-consent so we definitely get a refresh_token
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: 'Bearer';
};

/** Exchanges the one-time auth code for tokens. */
export async function exchangeAuthCode(code: string): Promise<TokenResponse> {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error('Google client credentials missing');
  }
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: 'authorization_code',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${errBody}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Refreshes an expired access_token using the stored refresh_token. */
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  if (!env.googleClientId || !env.googleClientSecret) {
    throw new Error('Google client credentials missing');
  }
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    grant_type: 'refresh_token',
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Refresh failed (${res.status}): ${errBody}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Returns a usable access token, refreshing if expired. Persists any new token. */
export async function getValidAccessToken(integration: HealthIntegrationDoc): Promise<string> {
  const now = Date.now();
  // 60s buffer so we don't get caught mid-call.
  if (integration.expiresAt.getTime() - 60_000 > now) {
    return integration.accessToken;
  }
  if (!integration.refreshToken) {
    throw new Error('Access token expired and no refresh token available. User must re-connect.');
  }
  const refreshed = await refreshAccessToken(integration.refreshToken);
  integration.accessToken = refreshed.access_token;
  integration.expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
  if (refreshed.scope) integration.scope = refreshed.scope;
  await integration.save();
  return integration.accessToken;
}

/** Returns total steps for the given local-day in the user's server-local timezone. */
export async function getStepsForToday(accessToken: string): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;

  // Pin the data source to Google Fit's "estimated_steps" pipeline — this is what
  // the consumer Fit app reads/writes, and what's populated by phone sensors. The
  // bare `com.google.step_count.delta` query without a dataSourceId often returns
  // empty buckets even when the user has steps in their account.
  const body = {
    aggregateBy: [{
      dataTypeName: 'com.google.step_count.delta',
      dataSourceId: 'derived:com.google.step_count.delta:com.google.android.gms:estimated_steps',
    }],
    bucketByTime: { durationMillis: endOfDay - startOfDay + 1 },
    startTimeMillis: startOfDay,
    endTimeMillis: endOfDay,
  };

  const res = await fetch(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Fit aggregate failed (${res.status}): ${errBody}`);
  }

  type AggResp = {
    bucket?: Array<{
      dataset?: Array<{
        point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }>;
      }>;
    }>;
  };
  const json = (await res.json()) as AggResp;
  let total = 0;
  for (const bucket of json.bucket ?? []) {
    for (const ds of bucket.dataset ?? []) {
      for (const point of ds.point ?? []) {
        for (const v of point.value ?? []) {
          total += v.intVal ?? Math.round(v.fpVal ?? 0);
        }
      }
    }
  }
  return total;
}

/** Revokes the user's grant with Google. Safe to ignore failures (token may already be invalid). */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
      method: 'POST',
    });
  } catch {
    // best-effort
  }
}

export async function findIntegration(userId: string) {
  return HealthIntegration.findOne({ userId, provider: 'google-fit' });
}
