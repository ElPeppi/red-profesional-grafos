import { afterAll, describe, expect, it } from 'vitest';
import { consulta, nombresDeConsultas, parsearBloques } from '../src/consultas.js';
import { cerrarDriver, leer } from '../src/neo4j.js';

afterAll(cerrarDriver);

describe('parsearBloques', () => {
  it('quita comentarios, líneas :param y el punto y coma final', () => {
    const texto = [
      '// título',
      '// @prueba',
      '// explicación',
      ":param id => 'x'",
      '',
      'MATCH (u {id: $id})',
      '  // comentario interno',
      'RETURN u;',
      '',
      'RETURN 1;',
    ].join('\n');

    expect(parsearBloques(texto)).toEqual(new Map([['prueba', 'MATCH (u {id: $id})\nRETURN u']]));
  });

  it('entiende finales de línea de Windows', () => {
    expect(parsearBloques('// @a\r\nRETURN 1;\r\n').get('a')).toBe('RETURN 1');
  });

  it('rechaza nombres duplicados', () => {
    expect(() => parsearBloques('// @a\nRETURN 1;\n// @a\nRETURN 2;')).toThrow('Consulta duplicada: a');
  });

  it('rechaza una consulta sin terminar', () => {
    expect(() => parsearBloques('// @a\nRETURN 1\n// @b\nRETURN 2;')).toThrow('La consulta a no termina');
    expect(() => parsearBloques('// @a\nRETURN 1')).toThrow('La consulta a no termina');
  });
});

describe('consultas de db/', () => {
  it('carga las 14 de lectura y las de operaciones', () => {
    const nombres = nombresDeConsultas();
    expect(nombres).toContain('candidatosParaOferta');
    expect(nombres).toContain('comunidades');
    expect(nombres).toContain('crearUsuario');
    expect(nombres.length).toBeGreaterThanOrEqual(23);
  });

  it('avisa si se pide una consulta que no existe', () => {
    expect(() => consulta('noExiste')).toThrow('No existe la consulta @noExiste');
  });

  // Revisión estática a propósito: una prueba del resultado solo fallaría de 7 p. m. a
  // medianoche, cuando en UTC ya es otro día.
  it('ninguna fecha depende de la zona horaria del contenedor', () => {
    for (const nombre of nombresDeConsultas()) {
      expect(consulta(nombre), nombre).not.toMatch(/\bdate\(\)/);
    }
  });

  // EXPLAIN pide el plan sin ejecutar: valida sintaxis y etiquetas sin tocar datos.
  it.each(nombresDeConsultas())('%s compila en Neo4j', async (nombre) => {
    await expect(leer(`EXPLAIN ${consulta(nombre)}`)).resolves.toEqual([]);
  });
});
