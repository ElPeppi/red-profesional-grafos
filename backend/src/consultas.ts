import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Todo el Cypher vive en db/: lo que se entrega es lo que corre la aplicación.
const ARCHIVOS = ['03_consultas.cypher', '04_operaciones.cypher'];
const MARCA = /^\/\/\s*@(\w+)\s*$/;

/**
 * Extrae las consultas marcadas con // @nombre. Cada una va desde su marca hasta
 * el primer punto y coma al final de una línea. Quita comentarios y líneas :param,
 * que son para cypher-shell y Neo4j Browser.
 */
export function parsearBloques(texto: string): Map<string, string> {
  const bloques = new Map<string, string>();
  let nombre: string | null = null;
  let lineas: string[] = [];

  for (const cruda of texto.split(/\r?\n/)) {
    const linea = cruda.trim();
    const marca = MARCA.exec(linea);

    if (marca) {
      if (nombre) throw new Error(`La consulta ${nombre} no termina en punto y coma`);
      nombre = marca[1] ?? null;
      if (nombre && bloques.has(nombre)) throw new Error(`Consulta duplicada: ${nombre}`);
      lineas = [];
      continue;
    }

    if (!nombre || linea === '' || linea.startsWith('//') || linea.startsWith(':param')) continue;

    if (linea.endsWith(';')) {
      lineas.push(cruda.trimEnd().slice(0, -1));
      bloques.set(nombre, lineas.join('\n'));
      nombre = null;
    } else {
      lineas.push(cruda.trimEnd());
    }
  }

  if (nombre) throw new Error(`La consulta ${nombre} no termina en punto y coma`);
  return bloques;
}

function cargarTodas(): Map<string, string> {
  const todas = new Map<string, string>();
  for (const archivo of ARCHIVOS) {
    const ruta = fileURLToPath(new URL(`../../db/${archivo}`, import.meta.url));
    for (const [nombre, cypher] of parsearBloques(readFileSync(ruta, 'utf8'))) {
      if (todas.has(nombre)) throw new Error(`Consulta duplicada: ${nombre}`);
      todas.set(nombre, cypher);
    }
  }
  return todas;
}

const consultas = cargarTodas();

export const nombresDeConsultas = (): string[] => [...consultas.keys()];

/** Devuelve el Cypher de una consulta. Usada al cargar cada módulo, un nombre mal escrito falla al arrancar. */
export function consulta(nombre: string): string {
  const cypher = consultas.get(nombre);
  if (!cypher) throw new Error(`No existe la consulta @${nombre} en db/`);
  return cypher;
}
