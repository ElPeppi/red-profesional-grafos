import { describe, expect, it } from 'vitest';
import { CONSULTAS } from '../src/consultas.js';
import { alcance, comunes, distancia, prepararEntradas, TAMANO_LOTE, TOTAL_ENTRADAS } from '../src/entradas.js';
import { iguales, percentil, resumirTiempos } from '../src/estadistica.js';
import { generarRed } from '../src/modelo.js';

// Grafo chico a mano:  a - b - c - d     e (aislada)
//                       \_____/
const vecinos = new Map([
  ['a', ['b', 'c']],
  ['b', ['a', 'c']],
  ['c', ['b', 'a', 'd']],
  ['d', ['c']],
  ['e', []],
]);

describe('verdad en memoria', () => {
  it('distancia por BFS, con límite y sin camino', () => {
    expect(distancia(vecinos, 'a', 'a', 6)).toBe(0);
    expect(distancia(vecinos, 'a', 'c', 6)).toBe(1);
    expect(distancia(vecinos, 'a', 'd', 6)).toBe(2);
    expect(distancia(vecinos, 'a', 'd', 1)).toBeNull();
    expect(distancia(vecinos, 'a', 'e', 6)).toBeNull();
  });

  it('alcance cuenta personas distintas, sin la de origen', () => {
    expect(alcance(vecinos, 'a', 1)).toBe(2);
    expect(alcance(vecinos, 'a', 2)).toBe(3);
    expect(alcance(vecinos, 'a', 9)).toBe(3);
    expect(alcance(vecinos, 'e', 3)).toBe(0);
  });

  it('contactos en común, ordenados', () => {
    expect(comunes(vecinos, 'a', 'd')).toEqual(['c']);
    expect(comunes(vecinos, 'b', 'c')).toEqual(['a']);
  });
});

describe('entradas', () => {
  const red = generarRed(2_000);
  const entradas = prepararEntradas(red);

  it('son las mismas en cada corrida', () => {
    const otra = prepararEntradas(generarRed(2_000));
    expect(otra.usuarios).toEqual(entradas.usuarios);
    expect(otra.pares).toEqual(entradas.pares);
  });

  it('alcanzan para calentar y medir, y solo usan personas con contactos', () => {
    expect(entradas.usuarios).toHaveLength(TOTAL_ENTRADAS);
    expect(entradas.usuarios.every((id) => (entradas.vecinos.get(id)?.length ?? 0) > 0)).toBe(true);
    expect(entradas.pares.every(([a, b]) => a !== b)).toBe(true);
  });

  it('los lotes de escritura no repiten conexiones existentes ni entre ellos', () => {
    const existentes = new Set(red.conexiones.flatMap((c) => [`${c.usuarioA}|${c.usuarioB}`, `${c.usuarioB}|${c.usuarioA}`]));
    const nuevas = entradas.lotes.flat().map(([a, b]) => [a, b].sort().join('|'));

    expect(entradas.lotes.every((lote) => lote.length === TAMANO_LOTE)).toBe(true);
    expect(new Set(nuevas).size).toBe(nuevas.length);
    expect(entradas.lotes.flat().some(([a, b]) => existentes.has(`${a}|${b}`))).toBe(false);
  });
});

describe('consultas', () => {
  it('tienen nombres únicos y al menos una versión cada una', () => {
    const nombres = CONSULTAS.map((c) => c.nombre);
    expect(new Set(nombres).size).toBe(nombres.length);
    expect(CONSULTAS.every((c) => c.cypher || c.sql)).toBe(true);
  });

  it('las de lectura ordenan con desempate por id: si no, el orden no se puede comparar', () => {
    for (const consulta of CONSULTAS.filter((c) => !c.escritura)) {
      for (const texto of [consulta.cypher, consulta.sql]) {
        if (texto && /ORDER BY/i.test(texto)) expect(texto).toMatch(/ORDER BY[^\n]*\bid\b/i);
      }
    }
  });
});

describe('estadística', () => {
  it('mediana y p95 por rango más cercano', () => {
    const tiempos = Array.from({ length: 20 }, (_, i) => i + 1);
    const resumen = resumirTiempos(tiempos);

    expect(resumen.mediana).toBe(10.5);
    expect(resumen.p95).toBe(19);
    expect(resumen.minimo).toBe(1);
    expect(resumen.maximo).toBe(20);
    expect(percentil([5], 95)).toBe(5);
  });

  it('un valor extremo mueve la media pero no la mediana', () => {
    const resumen = resumirTiempos([10, 10, 10, 10, 1000]);
    expect(resumen.mediana).toBe(10);
    expect(resumen.media).toBe(208);
  });

  it('compara con tolerancia en decimales y exacto en lo demás', () => {
    expect(iguales([[1, 'a', 0.1 + 0.2]], [[1, 'a', 0.3]])).toBe(true);
    expect(iguales([[1, 'a']], [[1, 'b']])).toBe(false);
    expect(iguales([[1]], [[1], [2]])).toBe(false);
    expect(iguales([[null]], [[null]])).toBe(true);
    expect(iguales([[0.5]], [[0.6]])).toBe(false);
  });
});
