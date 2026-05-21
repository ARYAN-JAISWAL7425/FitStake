// Mark-goal-done helper.
// - When authenticated: POSTs to /completions, emits cycle-changed + user-changed
//   so useCycle and useUser refetch automatically.
// - When unauthenticated: no-op (returns false). Callers can choose to navigate.

import { useState } from 'react';
import { api, ApiError } from '../lib/api';
import { getToken, setStoredUser } from '../lib/auth';
import { emit } from '../lib/events';

export type CompleteResult =
  | { ok: true; already: boolean; goalFp: number; dayBonusFp: number; dayJustCredited: boolean; verifiedSteps?: number | null }
  | { ok: false; reason: 'unauthenticated' | 'error' | 'insufficient_steps' | 'google_fit_required' | 'photo_required' | 'duplicate_photo'; message?: string; steps?: number; target?: number };

export function useCompletion() {
  const [submitting, setSubmitting] = useState(false);

  const complete = async (goalId: string): Promise<CompleteResult> => {
    if (!getToken()) return { ok: false, reason: 'unauthenticated' };
    setSubmitting(true);
    try {
      const res = await api.post<{
        already: boolean;
        awarded?: { goalFp: number; dayBonusFp: number; total: number; dayJustCredited: boolean };
        verifiedSteps?: number | null;
        cycle: unknown;
        user: { id: string; email: string; name: string; initial: string; tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'; fp: number; walletBalance: number; available: number };
      }>('/completions', { goalId });

      if (res.user) setStoredUser(res.user);
      emit('cycle-changed');
      emit('user-changed');

      return {
        ok: true,
        already: res.already,
        goalFp: res.awarded?.goalFp ?? 0,
        dayBonusFp: res.awarded?.dayBonusFp ?? 0,
        dayJustCredited: res.awarded?.dayJustCredited ?? false,
        verifiedSteps: res.verifiedSteps ?? null,
      };
    } catch (err) {
      // 409 with structured reason — surface to caller so the UI can react (prompt
      // for Google Fit connect, show step shortfall, etc.).
      if (err instanceof ApiError && err.status === 409) {
        const details = err.details as { reason?: string; steps?: number; target?: number; message?: string } | null;
        if (details?.reason === 'insufficient_steps') {
          return {
            ok: false,
            reason: 'insufficient_steps',
            message: details.message,
            steps: details.steps,
            target: details.target,
          };
        }
        if (details?.reason === 'google_fit_required') {
          return { ok: false, reason: 'google_fit_required', message: details.message };
        }
        if (details?.reason === 'photo_required') {
          return { ok: false, reason: 'photo_required', message: details.message };
        }
      }
      const message = err instanceof ApiError ? err.message : 'Could not mark goal complete.';
      return { ok: false, reason: 'error', message };
    } finally {
      setSubmitting(false);
    }
  };

  const completeWithPhoto = async (goalId: string, file: File): Promise<CompleteResult> => {
    if (!getToken()) return { ok: false, reason: 'unauthenticated' };
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('goalId', goalId);
      form.append('photo', file);
      const res = await api.post<{
        already: boolean;
        awarded?: { goalFp: number; dayBonusFp: number; total: number; dayJustCredited: boolean };
        cycle: unknown;
        user: { id: string; email: string; name: string; initial: string; tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum'; fp: number; walletBalance: number; available: number };
      }>('/completions/photo', form);

      if (res.user) setStoredUser(res.user);
      emit('cycle-changed');
      emit('user-changed');

      return {
        ok: true,
        already: res.already,
        goalFp: res.awarded?.goalFp ?? 0,
        dayBonusFp: res.awarded?.dayBonusFp ?? 0,
        dayJustCredited: res.awarded?.dayJustCredited ?? false,
      };
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        const details = err.details as { reason?: string; message?: string } | null;
        if (details?.reason === 'duplicate_photo') {
          return { ok: false, reason: 'duplicate_photo', message: details.message };
        }
      }
      const message = err instanceof ApiError ? err.message : 'Could not upload photo.';
      return { ok: false, reason: 'error', message };
    } finally {
      setSubmitting(false);
    }
  };

  return { complete, completeWithPhoto, submitting };
}
