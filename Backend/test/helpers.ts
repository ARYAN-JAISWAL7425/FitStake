import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import request from 'supertest';
import { app } from '../src/app';

let mongo: MongoMemoryServer | null = null;

export async function startTestDb(): Promise<void> {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'fitstake-test' });
}

export async function stopTestDb(): Promise<void> {
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
  mongo = null;
}

export async function clearAllCollections(): Promise<void> {
  const cols = mongoose.connection.collections;
  await Promise.all(Object.values(cols).map((c) => c.deleteMany({})));
}

/**
 * Register a fresh user and return { token, userId, email }.
 */
export async function registerUser(overrides: { email?: string; password?: string; name?: string } = {}) {
  const email = overrides.email ?? `u${Date.now()}${Math.floor(Math.random() * 1000)}@test.com`;
  const password = overrides.password ?? 'password123';
  const name = overrides.name ?? 'Test User';
  const res = await request(app).post('/auth/register').send({ email, password, name });
  if (res.status !== 201) throw new Error(`register failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { token: res.body.token as string, userId: res.body.user.id as string, email, password };
}

/** Authed supertest builder — applies Bearer header. */
export function authed(token: string) {
  return {
    get: (p: string) => request(app).get(p).set('Authorization', `Bearer ${token}`),
    post: (p: string) => request(app).post(p).set('Authorization', `Bearer ${token}`),
    del: (p: string) => request(app).delete(p).set('Authorization', `Bearer ${token}`),
  };
}

export { app, request };
