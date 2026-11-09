import { describe, expect, it } from 'vitest';
import { aCsv } from '../src/archivos.js';
import { bloquesCypher } from '../src/bases.js';
import { generarRed } from '../src/modelo.js';
import { resumir } from '../src/resumen.js';

const red = generarRed(5_000);

describe('generarRed', () => {
  it('misma semilla, misma red; otra semilla, otra red', () => {
    expect(JSON.stringify(generarRed(800))).toBe(JSON.stringify(generarRed(800)));
    expect(JSON.stringify(generarRed(800, 7))).not.toBe(JSON.stringify(generarRed(800)));
  });

  it('crea la cantidad pedida de personas, con ids y emails únicos', () => {
    expect(red.usuarios).toHaveLength(5_000);
    expect(new Set(red.usuarios.map((u) => u.id)).size).toBe(5_000);
    expect(new Set(red.usuarios.map((u) => u.email)).size).toBe(5_000);
  });

  it('cada conexión une a dos personas distintas y ningún par se repite en ningún sentido', () => {
    const pares = red.conexiones.map(({ usuarioA, usuarioB }) => [usuarioA, usuarioB].sort().join('|'));

    expect(red.conexiones.every((c) => c.usuarioA !== c.usuarioB)).toBe(true);
    expect(new Set(pares).size).toBe(pares.length);
  });

  it('toda referencia apunta a algo que existe', () => {
    const usuarios = new Set(red.usuarios.map((u) => u.id));
    const empresas = new Set(red.empresas.map((e) => e.id));
    const ofertas = new Set(red.ofertas.map((o) => o.id));
    const proyectos = new Set(red.proyectos.map((p) => p.id));

    expect(red.conexiones.every((c) => usuarios.has(c.usuarioA) && usuarios.has(c.usuarioB))).toBe(true);
    expect(red.trabajaEn.every((t) => usuarios.has(t.usuarioId) && empresas.has(t.empresaId))).toBe(true);
    expect(red.participaEn.every((p) => usuarios.has(p.usuarioId) && proyectos.has(p.proyectoId))).toBe(true);
    expect(red.postulaA.every((p) => usuarios.has(p.usuarioId) && ofertas.has(p.ofertaId))).toBe(true);
    expect(red.ofertas.every((o) => empresas.has(o.empresaId))).toBe(true);
    expect(red.proyectos.every((p) => p.empresaId === null || empresas.has(p.empresaId))).toBe(true);
  });

  it('no repite llaves primarias en las tablas de relación', () => {
    const unicas = (claves: string[]) => new Set(claves).size === claves.length;

    expect(unicas(red.tieneHabilidad.map((t) => `${t.usuarioId}|${t.habilidadId}`))).toBe(true);
    expect(unicas(red.trabajaEn.map((t) => `${t.usuarioId}|${t.empresaId}`))).toBe(true);
    expect(unicas(red.participaEn.map((t) => `${t.usuarioId}|${t.proyectoId}`))).toBe(true);
    expect(unicas(red.requiere.map((t) => `${t.ofertaId}|${t.habilidadId}`))).toBe(true);
    expect(unicas(red.usa.map((t) => `${t.proyectoId}|${t.habilidadId}`))).toBe(true);
    expect(unicas(red.postulaA.map((t) => `${t.usuarioId}|${t.ofertaId}`))).toBe(true);
  });

  it('forma comunidades: la mayoría de conexiones queda dentro de una ciudad', () => {
    const ciudad = new Map(red.usuarios.map((u) => [u.id, u.ciudadId]));
    const internas = red.conexiones.filter((c) => ciudad.get(c.usuarioA) === ciudad.get(c.usuarioB)).length;

    expect(internas / red.conexiones.length).toBeGreaterThan(0.75);
  });

  it('tiene personas muy conectadas: el grado máximo supera con creces al promedio', () => {
    const { gradoMaximo, conexiones, usuarios } = resumir(red);
    const promedio = (2 * conexiones) / usuarios;

    expect(promedio).toBeGreaterThan(6);
    expect(promedio).toBeLessThan(14);
    expect(gradoMaximo).toBeGreaterThan(8 * promedio);
  });

  it('deja algunas personas sin conexiones, como en una red real', () => {
    const conectadas = new Set(red.conexiones.flatMap((c) => [c.usuarioA, c.usuarioB]));
    const aisladas = red.usuarios.filter((u) => !conectadas.has(u.id)).length;

    expect(aisladas).toBeGreaterThan(0);
    expect(aisladas / red.usuarios.length).toBeLessThan(0.05);
  });
});

describe('aCsv', () => {
  it('pone comillas donde hace falta y deja vacío el nulo', () => {
    const csv = aCsv([{ a: 'con, coma', b: 'con "comillas"', c: null }], ['a', 'b', 'c']);

    expect(csv).toBe('a,b,c\n"con, coma","con ""comillas""",\n');
  });
});

describe('bloquesCypher', () => {
  it('separa por marca y por punto y coma, sin comentarios', () => {
    const bloques = bloquesCypher('// encabezado\n\n// @uno\n// comentario\nRETURN 1;\nRETURN 2;\n\n// @dos\nRETURN 3;\n');

    expect(bloques.get('uno')).toEqual(['RETURN 1', 'RETURN 2']);
    expect(bloques.get('dos')).toEqual(['RETURN 3']);
  });
});
