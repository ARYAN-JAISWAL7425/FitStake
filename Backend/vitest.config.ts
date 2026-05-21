import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    // Vitest 4: pool options are top-level. Keep tests serial so each file owns its own
    // mongo-memory-server lifetime without port/dir collisions.
    pool: 'forks',
    fileParallelism: false,
  },
});
