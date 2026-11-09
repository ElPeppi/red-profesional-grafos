import { z } from 'zod';
import { entero } from './neo4j.js';

// Los valores llegan como texto en la URL: coerce los convierte a número.
export const paginaEsquema = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  limite: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagina = z.infer<typeof paginaEsquema>;

/** SKIP y LIMIT exigen enteros: sin entero() Neo4j rechaza la consulta. */
export const aSaltoYLimite = ({ pagina, limite }: Pagina) => ({
  salto: entero((pagina - 1) * limite),
  limite: entero(limite),
});
