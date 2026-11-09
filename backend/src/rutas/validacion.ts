import { z } from 'zod';

/** Para los PATCH: usar con .partial().refine(...alMenosUnCampo). */
export const alMenosUnCampo = [
  (cambios: object) => Object.keys(cambios).length > 0,
  'Envía al menos un campo para cambiar',
] as const;

/** Nivel de una habilidad: 1 (básico) a 5 (experto). */
export const nivelHabilidad = z.number().int().min(1).max(5);
