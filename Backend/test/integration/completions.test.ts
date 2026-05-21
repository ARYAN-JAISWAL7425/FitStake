import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { startTestDb, stopTestDb, clearAllCollections, registerUser, authed, app, request } from '../helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearAllCollections);

const goals = [
  // Use templateIds that go down the honor-system / photo paths so we don't need
  // Google Fit. Sleep = honor-tap (no proof required). Water = photo-required.
  { templateId: 'sleep', title: 'Sleep 7h', target: 7, unit: 'hours' },
  { templateId: 'water', title: 'Drink 2L', target: 2, unit: 'L' },
];

async function startCycle(token: string) {
  await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
  const res = await authed(token).post('/cycles').send({ stake: 500, goals });
  return res.body.cycle as { id: string; goals: { id: string; templateId: string }[] };
}

describe('POST /completions (tap-to-complete)', () => {
  it('credits FP for an honor-system goal and is idempotent', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const sleepGoal = cycle.goals.find((g) => g.templateId === 'sleep')!;

    const first = await authed(token).post('/completions').send({ goalId: sleepGoal.id });
    expect(first.status).toBe(201);
    expect(first.body.already).toBe(false);
    expect(first.body.awarded.goalFp).toBeGreaterThan(0);

    const second = await authed(token).post('/completions').send({ goalId: sleepGoal.id });
    expect(second.status).toBe(200);
    expect(second.body.already).toBe(true);
    expect(second.body.awarded.total).toBe(0);
  });

  it('rejects a photo-required goal via the plain /completions path', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const waterGoal = cycle.goals.find((g) => g.templateId === 'water')!;
    const res = await authed(token).post('/completions').send({ goalId: waterGoal.id });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('photo_required');
  });

  it('returns 400 when there is no active cycle', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/completions').send({ goalId: 'whatever' });
    expect(res.status).toBe(400);
  });
});

describe('POST /completions/photo (photo proof + dedupe)', () => {
  it('accepts a fresh photo and credits the water goal', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const waterGoal = cycle.goals.find((g) => g.templateId === 'water')!;

    const buf = Buffer.from('fake-jpeg-bytes-photo-A');
    const res = await request(app)
      .post('/completions/photo')
      .set('Authorization', `Bearer ${token}`)
      .field('goalId', waterGoal.id)
      .attach('photo', buf, { filename: 'a.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.already).toBe(false);
    expect(res.body.awarded.goalFp).toBeGreaterThan(0);
  });

  it('rejects an exact-duplicate photo with 409 duplicate_photo', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const waterGoal = cycle.goals.find((g) => g.templateId === 'water')!;
    const sleepGoal = cycle.goals.find((g) => g.templateId === 'sleep')!;
    const buf = Buffer.from('fake-jpeg-bytes-same-photo');

    // First upload: succeeds for water.
    const a = await request(app)
      .post('/completions/photo')
      .set('Authorization', `Bearer ${token}`)
      .field('goalId', waterGoal.id)
      .attach('photo', buf, { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(a.status).toBe(201);

    // Second upload of the SAME bytes for a DIFFERENT goal → must be rejected.
    const b = await request(app)
      .post('/completions/photo')
      .set('Authorization', `Bearer ${token}`)
      .field('goalId', sleepGoal.id)
      .attach('photo', buf, { filename: 'b.jpg', contentType: 'image/jpeg' });
    expect(b.status).toBe(409);
    expect(b.body.reason).toBe('duplicate_photo');
  });

  it('rejects non-image uploads', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const waterGoal = cycle.goals.find((g) => g.templateId === 'water')!;
    const buf = Buffer.from('plain text not an image');
    const res = await request(app)
      .post('/completions/photo')
      .set('Authorization', `Bearer ${token}`)
      .field('goalId', waterGoal.id)
      .attach('photo', buf, { filename: 'note.txt', contentType: 'text/plain' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

// Best-effort cleanup of the uploads dir created during tests.
afterAll(async () => {
  const uploads = path.resolve(__dirname, '..', '..', 'uploads');
  try { await fs.rm(uploads, { recursive: true, force: true }); } catch {/* ignore */}
});
