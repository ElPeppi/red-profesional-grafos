import { defineConfig } from '@playwright/test';
import base from './playwright.config';

// Ensayo de la demo (docs/guion-demo.md): aparte de la suite e2e porque necesita la semilla recién
// cargada y sin datos de otras pruebas, y porque sus datos no llevan la marca [prueba].
export default defineConfig({
  ...base,
  testDir: 'ensayo',
  globalTeardown: undefined,
  timeout: 180_000,
  expect: { timeout: 10_000 },
});
