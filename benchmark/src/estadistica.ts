export interface Estadisticas {
  n: number;
  minimo: number;
  mediana: number;
  p95: number;
  maximo: number;
  media: number;
}

/** Percentil por rango más cercano: el valor que deja por debajo al p % de las mediciones. */
export function percentil(ordenados: number[], p: number): number {
  if (ordenados.length === 0) return Number.NaN;
  const rango = Math.ceil((p / 100) * ordenados.length);
  return ordenados[Math.min(ordenados.length, Math.max(1, rango)) - 1] as number;
}

/**
 * La mediana y no el promedio: una pausa del recolector de basura o del sistema infla el promedio
 * con un solo valor. El p95 muestra la cola: qué tan mal le va al 5 % más lento.
 */
export function resumirTiempos(tiempos: number[]): Estadisticas {
  const ordenados = [...tiempos].sort((a, b) => a - b);
  const redondear = (x: number) => Math.round(x * 100) / 100;
  const n = ordenados.length;
  const mitad = Math.floor(n / 2);
  const mediana = n % 2 === 0 ? ((ordenados[mitad - 1] as number) + (ordenados[mitad] as number)) / 2 : (ordenados[mitad] as number);
  return {
    n,
    minimo: redondear(ordenados[0] ?? Number.NaN),
    mediana: redondear(mediana),
    p95: redondear(percentil(ordenados, 95)),
    maximo: redondear(ordenados.at(-1) ?? Number.NaN),
    media: redondear(ordenados.reduce((s, x) => s + x, 0) / n),
  };
}

/** Igualdad profunda con tolerancia para decimales: dos motores pueden redondear distinto el último bit. */
export function iguales(a: unknown, b: unknown): boolean {
  if (typeof a === 'number' && typeof b === 'number') return Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(a));
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => iguales(x, b[i]));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    const claves = Object.keys(a);
    return claves.length === Object.keys(b).length && claves.every((k) => iguales((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}
