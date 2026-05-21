import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestDb, stopTestDb, clearAllCollections, registerUser, authed } from '../helpers';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearAllCollections);

describe('Wallet', () => {
  it('GET /wallet returns zero for a fresh user', async () => {
    const { token } = await registerUser();
    const res = await authed(token).get('/wallet');
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(0);
    expect(res.body.available).toBe(0);
    expect(res.body.locked).toBe(0);
    expect(res.body.transactions).toEqual([]);
  });

  it('demo-credit funds the wallet and records a transaction', async () => {
    const { token } = await registerUser();
    const credit = await authed(token).post('/wallet/demo-credit').send({ amount: 2500 });
    expect(credit.status).toBe(200);
    expect(credit.body.user.walletBalance).toBe(2500);
    expect(credit.body.user.available).toBe(2500);

    const w = await authed(token).get('/wallet');
    expect(w.body.balance).toBe(2500);
    expect(w.body.transactions).toHaveLength(1);
    expect(w.body.transactions[0].kind).toBe('deposit');
  });

  it('demo-credit rejects amounts above the cap', async () => {
    const { token } = await registerUser();
    const res = await authed(token).post('/wallet/demo-credit').send({ amount: 60_000 });
    expect(res.status).toBe(400);
  });

  it('withdraw deducts available only when there is enough', async () => {
    const { token } = await registerUser();
    await authed(token).post('/wallet/demo-credit').send({ amount: 1000 });
    const ok = await authed(token).post('/wallet/withdraw').send({ amount: 400 });
    expect(ok.status).toBe(200);
    expect(ok.body.user.available).toBe(600);
    expect(ok.body.user.walletBalance).toBe(600);

    const over = await authed(token).post('/wallet/withdraw').send({ amount: 9999 });
    expect(over.status).toBe(400);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await (await import('supertest')).default(
      (await import('../../src/app')).app
    ).get('/wallet');
    expect(res.status).toBe(401);
  });
});
