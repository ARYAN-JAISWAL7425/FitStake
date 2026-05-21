import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { startTestDb, stopTestDb, clearAllCollections, app, request, registerUser } from '../helpers';
import { User } from '../../src/models/User';

beforeAll(startTestDb);
afterAll(stopTestDb);
beforeEach(clearAllCollections);

describe('POST /auth/register', () => {
  it('creates a user and returns a JWT', async () => {
    const res = await request(app).post('/auth/register').send({
      email: 'a@b.com',
      password: 'password123',
      name: 'Alice',
    });
    expect(res.status).toBe(201);
    expect(res.body.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(res.body.user.email).toBe('a@b.com');
    expect(res.body.user.fp).toBe(0);
    expect(res.body.user.passwordHash).toBeUndefined();
  });

  it('rejects duplicate emails with 409', async () => {
    const first = await request(app).post('/auth/register').send({ email: 'dup@b.com', password: 'password123', name: 'Alice' });
    expect(first.status).toBe(201);
    const res = await request(app).post('/auth/register').send({ email: 'dup@b.com', password: 'otherpass1', name: 'Bob' });
    expect(res.status).toBe(409);
  });

  it('rejects weak passwords with 400', async () => {
    const res = await request(app).post('/auth/register').send({ email: 'x@y.com', password: '123', name: 'Xena' });
    expect(res.status).toBe(400);
  });
});

describe('POST /auth/login', () => {
  it('returns a token for valid creds', async () => {
    const { email, password } = await registerUser();
    const res = await request(app).post('/auth/login').send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
  });

  it('returns 401 for wrong password', async () => {
    const { email } = await registerUser();
    const res = await request(app).post('/auth/login').send({ email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });

  it('returns 401 for unknown email', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'nobody@x.com', password: 'whatever' });
    expect(res.status).toBe(401);
  });
});

describe('POST /auth/forgot-password + reset-password', () => {
  it('sets a reset token + allows reset with the token, returns new JWT', async () => {
    const { email } = await registerUser();
    const fp = await request(app).post('/auth/forgot-password').send({ email });
    expect(fp.status).toBe(200);

    // Grab the token directly from the DB (mailer is in console mode under tests).
    const user = await User.findOne({ email });
    expect(user?.passwordResetToken).toBeTruthy();

    const reset = await request(app).post('/auth/reset-password').send({
      token: user!.passwordResetToken!,
      password: 'newPass456',
    });
    expect(reset.status).toBe(200);
    expect(reset.body.token).toBeTruthy();

    // Old password must no longer log in; new one must.
    const oldLogin = await request(app).post('/auth/login').send({ email, password: 'password123' });
    expect(oldLogin.status).toBe(401);
    const newLogin = await request(app).post('/auth/login').send({ email, password: 'newPass456' });
    expect(newLogin.status).toBe(200);
  });

  it('forgot returns 200 even for unknown emails (no enumeration)', async () => {
    const res = await request(app).post('/auth/forgot-password').send({ email: 'nobody@x.com' });
    expect(res.status).toBe(200);
  });

  it('rejects an expired/invalid reset token with 400', async () => {
    const res = await request(app).post('/auth/reset-password').send({
      token: 'a'.repeat(32),
      password: 'newPass789',
    });
    expect(res.status).toBe(400);
  });
});
