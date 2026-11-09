import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Las pruebas comparten la misma base: correrlas en paralelo las haría interferir.
    fileParallelism: false,
  },
});
