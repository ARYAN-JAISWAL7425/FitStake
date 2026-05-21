import { app } from './app';
import { env } from './lib/env';
import { connectDB } from './lib/db';

async function main() {
  await connectDB();
  app.listen(env.port, () => {
    console.log(`[server] listening on http://localhost:${env.port}`);
    console.log(`[server] CORS origins: ${env.corsOrigins.join(', ')}`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
