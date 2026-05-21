import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestDb, stopTestDb, clearAllCollections, registerUser, authed } from '../helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearAllCollections);

const sampleGoals = [
  { templateId: 'sleep', title: 'Sleep 7h', target: 7, unit: 'hours' },
  { templateId: 'water', title: 'Drink 2L', target: 2, unit: 'L' },
];

describe('POST /cycles (create + atomic stake lock)', () => {
  it('rejects with 400 when available balance is insufficient', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/insufficient/i);
  });

  it('creates a cycle and atomically debits available when funded', async () => {
    const { token } = await registerUser();
    await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
    const res = await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    expect(res.status).toBe(201);
    expect(res.body.user.available).toBe(500);
    expect(res.body.user.walletBalance).toBe(1000);
    expect(res.body.cycle.stake).toBe(500);
    expect(res.body.cycle.goals).toHaveLength(2);
  });

  it('rejects a second active cycle with 409', async () => {
    const { token } = await registerUser();
    await authed(token).post('/wallet/demo-credit').send({ amount: 2000 });
    await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    const res = await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    expect(res.status).toBe(409);
  });
});

describe('GET /cycles/current and /cycles/current/days', () => {
  it('returns null cycle for a fresh user', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/cycles/current');
    expect(res.status).toBe(200);
    expect(res.body.cycle).toBeNull();
  });

  it('returns the calendar for the active cycle (today + upcoming)', async () => {
    const { token } = await registerUser();
    await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
    await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    const res = await authed(token).get('/cycles/current/days');
    expect(res.status).toBe(200);
    expect(res.body.days).toHaveLength(30);
    expect(res.body.days[0].status).toBe('today');
    expect(res.body.days[29].status).toBe('upcoming');
    expect(res.body.totalGoals).toBe(2);
  });
});

describe('POST /cycles/current/resolve (simulate win/miss)', () => {
  it('simulate=win returns stake to wallet + completes cycle', async () => {
    const { token } = await registerUser();
    await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
    await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    const res = await authed(token).post('/cycles/current/resolve').send({ simulate: 'win' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('win');
    expect(res.body.user.available).toBe(1000); // 500 was debited at start, refunded on win
    expect(res.body.user.walletBalance).toBe(1000);
  });

  it('simulate=miss removes stake from wallet entirely', async () => {
    const { token } = await registerUser();
    await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
    await authed(token).post('/cycles').send({ stake: 500, goals: sampleGoals });
    const res = await authed(token).post('/cycles/current/resolve').send({ simulate: 'miss' });
    expect(res.status).toBe(200);
    expect(res.body.outcome).toBe('miss');
    // walletBalance dropped by stake; available was already debited at start.
    expect(res.body.user.walletBalance).toBe(500);
    expect(res.body.user.available).toBe(500);
  });

  it('returns 400 when no active cycle', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/cycles/current/resolve').send({ simulate: 'win' });
    expect(res.status).toBe(400);
  });
});
