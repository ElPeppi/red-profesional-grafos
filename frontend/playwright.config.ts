import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  // Todas las pruebas comparten la misma base: en paralelo se pisarían.
  workers: 1,
  globalTeardown: './e2e/limpieza.ts',
  use: {
    baseURL: 'http://localhost:5173',
    // El Chrome instalado: evita descargar otro navegador.
    channel: 'chrome',
    timezoneId: 'America/Bogota',
    locale: 'es-CO',
    trace: 'retain-on-failure',
  },
  // Enciende lo que falte. Neo4j con la semilla debe estar arriba.
  webServer: [
    { command: 'npm run dev', cwd: '../backend', url: 'http://localhost:3000/salud', reuseExistingServer: true },
    { command: 'npm run dev', url: 'http://localhost:5173', reuseExistingServer: true },
  ],
});
