// Express app — wired without DB connection or .listen(). Exposed so tests
// can drive it with supertest while supplying their own DB connection.
import express from 'express';
import cors from 'cors';
import { env } from './lib/env';
import { errorHandler, notFound } from './middleware/error';
import authRoutes from './routes/auth';
import meRoutes from './routes/me';
import cyclesRoutes from './routes/cycles';
import completionsRoutes from './routes/completions';
import walletRoutes from './routes/wallet';
import paymentsRoutes from './routes/payments';
import rewardsRoutes from './routes/rewards';
import squadsRoutes from './routes/squads';
import integrationsRoutes from './routes/integrations';
import supportRoutes from './routes/support';

export function buildApp() {
  const app = express();
  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin || env.corsOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ ok: true, service: 'fitstake-backend' });
  });

  app.use('/auth', authRoutes);
  app.use('/me', meRoutes);
  app.use('/cycles', cyclesRoutes);
  app.use('/completions', completionsRoutes);
  app.use('/wallet', walletRoutes);
  app.use('/payments', paymentsRoutes);
  app.use('/rewards', rewardsRoutes);
  app.use('/squads', squadsRoutes);
  app.use('/integrations', integrationsRoutes);
  app.use('/support', supportRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}

export const app = buildApp();
