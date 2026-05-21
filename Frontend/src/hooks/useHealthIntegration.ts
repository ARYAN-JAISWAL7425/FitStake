import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { getToken, clearAuth } from '../lib/auth';
import { useAppEvent } from '../lib/events';

export type HealthStatus = {
  configured: boolean;
  providers: {
    'google-fit': {
      connected: boolean;
      scope: string;
      connectedAt: string | null;
    };
  };
};

export function useHealthIntegration() {
  const [status, setStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(() => {
    if (!getToken()) return;
    setLoading(true);
    api
      .get<HealthStatus>('/integrations/status')
      .then(setStatus)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) clearAuth();
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  useAppEvent('user-changed', refetch);

  const connect = async () => {
    const res = await api.get<{ url: string }>('/integrations/google-fit/auth-url');
    // Redirect this tab to Google's consent screen. After consent, Google sends
    // the user to our backend callback, which then redirects to /profile?google_fit=connected.
    window.location.href = res.url;
  };

  const disconnect = async () => {
    await api.del('/integrations/google-fit');
    refetch();
  };

  const syncSteps = async () => {
    return api.post<{ provider: string; steps: number; fetchedAt: string }>(
      '/integrations/google-fit/sync'
    );
  };

  return { status, loading, refetch, connect, disconnect, syncSteps };
}
