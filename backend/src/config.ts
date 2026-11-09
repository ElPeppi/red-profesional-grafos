import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

// Lee backend/.env si existe. Las variables ya definidas en el sistema tienen prioridad.
const rutaEnv = fileURLToPath(new URL('../.env', import.meta.url));
if (existsSync(rutaEnv)) process.loadEnvFile(rutaEnv);

const esquema = z.object({
  NEO4J_URI: z.string().default('bolt://localhost:7687'),
  NEO4J_USUARIO: z.string().default('neo4j'),
  NEO4J_PASSWORD: z.string().min(1, 'Falta NEO4J_PASSWORD: copia backend/.env.example como backend/.env'),
  PUERTO: z.coerce.number().int().positive().default(3000),
});

// Falla al arrancar si falta algo, en vez de fallar luego en la primera consulta.
export const config = esquema.parse(process.env);
