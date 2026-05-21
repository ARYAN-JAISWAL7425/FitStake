import mongoose from 'mongoose';
import { env } from './env';

let connected = false;

export async function connectDB() {
  if (connected) return;
  await mongoose.connect(env.mongodbUri, { dbName: env.dbName });
  connected = true;
  console.log(`[db] connected to ${env.dbName}`);
}

mongoose.connection.on('error', (err) => {
  console.error('[db] connection error:', err.message);
});

mongoose.connection.on('disconnected', () => {
  connected = false;
  console.warn('[db] disconnected');
});
