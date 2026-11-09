import { Azar } from './azar.js';
import type { Red } from './modelo.js';

/** Calentar con las primeras, medir con el resto: cada repetición usa una entrada distinta. */
export const CALENTAMIENTO = 5;
export const REPETICIONES = 30;
export const TOTAL_ENTRADAS = CALENTAMIENTO + REPETICIONES;
export const TAMANO_LOTE = 1_000;
export const PAGINA = 20;

export interface Entradas {
  usuarios: string[];
  pares: [string, string][];
  ofertas: string[];
  saltos: number[];
  lotes: [string, string][][];
  vecinos: Map<string, string[]>;
}

/**
 * Entradas de cada consulta, elegidas con semilla propia: las dos bases reciben exactamente las
 * mismas, en el mismo orden. Solo personas con al menos un contacto: con una aislada, recorrer
 * la red no cuesta nada y el promedio engañaría.
 */
export function prepararEntradas(red: Red): Entradas {
  const azar = new Azar(99);
  const vecinos = new Map<string, string[]>(red.usuarios.map((u) => [u.id, []]));
  for (const { usuarioA, usuarioB } of red.conexiones) {
    vecinos.get(usuarioA)?.push(usuarioB);
    vecinos.get(usuarioB)?.push(usuarioA);
  }
  const conectados = red.usuarios.filter((u) => (vecinos.get(u.id)?.length ?? 0) > 0).map((u) => u.id);
  const conRequisitos = new Set(red.requiere.map((r) => r.ofertaId));
  const ofertas = red.ofertas.filter((o) => o.estado === 'abierta' && conRequisitos.has(o.id)).map((o) => o.id);

  const pares: [string, string][] = [];
  while (pares.length < TOTAL_ENTRADAS) {
    const [a, b] = azar.varios(conectados, 2);
    if (a && b) pares.push([a, b]);
  }

  // Lotes de conexiones que todavía no existen, para medir escritura.
  const existentes = new Set(red.conexiones.flatMap((c) => [`${c.usuarioA}|${c.usuarioB}`, `${c.usuarioB}|${c.usuarioA}`]));
  const lotes: [string, string][][] = [];
  for (let l = 0; l < TOTAL_ENTRADAS; l++) {
    const lote: [string, string][] = [];
    while (lote.length < TAMANO_LOTE) {
      const a = azar.elegir(red.usuarios).id;
      const b = azar.elegir(red.usuarios).id;
      if (a === b || existentes.has(`${a}|${b}`)) continue;
      existentes.add(`${a}|${b}`);
      existentes.add(`${b}|${a}`);
      lote.push([a, b]);
    }
    lotes.push(lote);
  }

  return {
    usuarios: azar.varios(conectados, TOTAL_ENTRADAS),
    pares,
    ofertas: Array.from({ length: TOTAL_ENTRADAS }, () => azar.elegir(ofertas)),
    saltos: Array.from({ length: TOTAL_ENTRADAS }, () => azar.entero(0, red.usuarios.length - PAGINA)),
    lotes,
    vecinos,
  };
}

// ---------- Verdad calculada en memoria ----------
// Respuestas que se pueden calcular directo sobre la red generada. Si una base no da esto,
// el error está en la consulta, no en la otra base.

/** Distancia en saltos por búsqueda en anchura (BFS), o null si está a más de `maximo`. */
export function distancia(vecinos: Map<string, string[]>, origen: string, destino: string, maximo: number): number | null {
  if (origen === destino) return 0;
  const visto = new Set([origen]);
  let frontera = [origen];
  for (let nivel = 1; nivel <= maximo && frontera.length > 0; nivel++) {
    const siguiente: string[] = [];
    for (const id of frontera) {
      for (const vecino of vecinos.get(id) ?? []) {
        if (vecino === destino) return nivel;
        if (!visto.has(vecino)) {
          visto.add(vecino);
          siguiente.push(vecino);
        }
      }
    }
    frontera = siguiente;
  }
  return null;
}

/** Cuántas personas distintas hay a `saltos` o menos, sin contar a la de origen. */
export function alcance(vecinos: Map<string, string[]>, origen: string, saltos: number): number {
  const visto = new Set([origen]);
  let frontera = [origen];
  for (let nivel = 1; nivel <= saltos; nivel++) {
    const siguiente: string[] = [];
    for (const id of frontera) {
      for (const vecino of vecinos.get(id) ?? []) {
        if (!visto.has(vecino)) {
          visto.add(vecino);
          siguiente.push(vecino);
        }
      }
    }
    frontera = siguiente;
  }
  return visto.size - 1;
}

export function comunes(vecinos: Map<string, string[]>, a: string, b: string): string[] {
  const deB = new Set(vecinos.get(b));
  return (vecinos.get(a) ?? []).filter((id) => deB.has(id)).sort();
}
