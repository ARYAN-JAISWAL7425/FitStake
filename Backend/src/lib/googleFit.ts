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

async function sumDataset(accessToken: string, sourceId: string, startNs: number, endNs: number): Promise<number> {
  const res = await fetch(
    `https://www.googleapis.com/fitness/v1/users/me/dataSources/${encodeURIComponent(sourceId)}/datasets/${startNs}-${endNs}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) return 0;
  const json = (await res.json()) as { point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> };
  let total = 0;
  for (const p of json.point ?? []) {
    for (const v of p.value ?? []) total += v.intVal ?? Math.round(v.fpVal ?? 0);
  }
  return total;
}

async function aggregateAcrossAllSources(accessToken: string, startMs: number, endMs: number): Promise<number> {
  // No dataSourceId → Google merges across every source the user has for this
  // data type. This is the canonical "step count" the Fit app would show.
  const body = {
    aggregateBy: [{ dataTypeName: 'com.google.step_count.delta' }],
    bucketByTime: { durationMillis: endMs - startMs + 1 },
    startTimeMillis: startMs,
    endTimeMillis: endMs,
  };
  const res = await fetch(
    'https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) return 0;
  type AggResp = { bucket?: Array<{ dataset?: Array<{ point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }> }> };
  const json = (await res.json()) as AggResp;
  let total = 0;
  for (const bucket of json.bucket ?? []) {
    for (const ds of bucket.dataset ?? []) {
      for (const p of ds.point ?? []) {
        for (const v of p.value ?? []) total += v.intVal ?? Math.round(v.fpVal ?? 0);
      }
    }
  }
  return total;
}

/**
 * Returns total steps for today — matching what Google Fit's app shows.
 *
 * Strategy:
 *   1) Cross-source aggregate (NO dataSourceId pin) — Google's official merge of
 *      every step source the user has (phone + wearable + manual). This is what
 *      the Fit app reads. Highest fidelity when data has propagated.
 *   2) Per-device top_level sources (live data, low lag, but excludes wearables
 *      whose data lives in separate `raw:` streams).
 *   3) Estimated_steps aggregated source (slower, but covers accounts where the
 *      device-level streams are empty).
 */
export async function getStepsForToday(accessToken: string): Promise<number> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const endOfDay = startOfDay + 24 * 60 * 60 * 1000 - 1;
  const startNs = startOfDay * 1_000_000;
  const endNs = endOfDay * 1_000_000;

  // 1) Canonical cross-source aggregate.
  const canonical = await aggregateAcrossAllSources(accessToken, startOfDay, endOfDay);
  if (canonical > 0) return canonical;

  // 2) Per-device top_level fallback.
  try {
    const dsRes = await fetch(
      'https://www.googleapis.com/fitness/v1/users/me/dataSources?dataTypeName=com.google.step_count.delta',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (dsRes.ok) {
      const dsJson = (await dsRes.json()) as { dataSource?: Array<{ dataStreamId: string; dataStreamName?: string; type?: string }> };
      const sources = dsJson.dataSource ?? [];
      const topLevels = sources.filter((s) => s.dataStreamName === 'top_level');
      let topTotal = 0;
      for (const s of topLevels) topTotal += await sumDataset(accessToken, s.dataStreamId, startNs, endNs);
      // Add any RAW external-app sources (e.g. boAt wearable) — those aren't
      // merged into top_level since they're not from the Google Fit app on phone.
      const rawExternals = sources.filter((s) => s.type === 'raw');
      let rawTotal = 0;
      for (const s of rawExternals) rawTotal += await sumDataset(accessToken, s.dataStreamId, startNs, endNs);
      const combined = topTotal + rawTotal;
      if (combined > 0) return combined;
    }
  } catch {
    // fall through
  }

  // 3) Aggregated estimated_steps fallback.
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
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Google Fit aggregate failed (${res.status}): ${errBody}`);
  }
  type AggResp = { bucket?: Array<{ dataset?: Array<{ point?: Array<{ value?: Array<{ intVal?: number; fpVal?: number }> }> }> }> };
  const json = (await res.json()) as AggResp;
  let total = 0;
  for (const bucket of json.bucket ?? []) {
    for (const ds of bucket.dataset ?? []) {
      for (const p of ds.point ?? []) {
        for (const v of p.value ?? []) total += v.intVal ?? Math.round(v.fpVal ?? 0);
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
