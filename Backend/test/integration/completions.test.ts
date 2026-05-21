import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import path from 'path';
import fs from 'fs/promises';
import { startTestDb, stopTestDb, clearAllCollections, registerUser, authed, app, request } from '../helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearAllCollections);

const goals = [
  // Both go down the photo-required path. All non-step goals require a photo;
  // 'steps' goes through Google Fit (which we don't want to mock here).
  { templateId: 'sleep', title: 'Sleep 7h', target: 7, unit: 'hours' },
  { templateId: 'water', title: 'Drink 2L', target: 2, unit: 'L' },
];

async function startCycle(token: string) {
  await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
  const res = await authed(token).post('/cycles').send({ stake: 500, goals });
  return res.body.cycle as { id: string; goals: { id: string; templateId: string }[] };
}

describe('POST /completions (tap-to-complete)', () => {
  it('rejects a photo-required sleep goal via the plain /completions path', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const sleepGoal = cycle.goals.find((g) => g.templateId === 'sleep')!;
    const res = await authed(token).post('/completions').send({ goalId: sleepGoal.id });
    expect(res.status).toBe(409);
    expect(res.body.reason).toBe('photo_required');
  });

  it('rejects a photo-required water goal via the plain /completions path', async () => {
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

  it('is idempotent on the photo path — second upload returns already=true with no extra FP', async () => {
    const { token } = await registerUser();
    const cycle = await startCycle(token);
    const waterGoal = cycle.goals.find((g) => g.templateId === 'water')!;
    const first = await request(app)
      .post('/completions/photo')
      .set('Authorization', `Bearer ${token}`)
      .field('goalId', waterGoal.id)
      .attach('photo', Buffer.from('photo-bytes-first'), { filename: 'a.jpg', contentType: 'image/jpeg' });
    expect(first.status).toBe(201);
    expect(first.body.awarded.goalFp).toBeGreaterThan(0);

    const second = await request(app)
      .post('/completions/photo')
      .set('Authorization', `Bearer ${token}`)
      .field('goalId', waterGoal.id)
      .attach('photo', Buffer.from('photo-bytes-second'), { filename: 'b.jpg', contentType: 'image/jpeg' });
    expect(second.status).toBe(200);
    expect(second.body.already).toBe(true);
    expect(second.body.awarded.total).toBe(0);
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
