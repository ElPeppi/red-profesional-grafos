import { consulta } from '../consultas.js';
import { leer } from '../neo4j.js';

const BORRAR_PROYECCION = consulta('borrarProyeccion');
const CREAR_PROYECCION = consulta('crearProyeccion');
const INFLUYENTES = consulta('influyentes');
const COMUNIDADES = consulta('comunidades');
const HABILIDADES_DEMANDADAS = consulta('habilidadesDemandadas');
const GRAFO_DE_LA_RED = consulta('grafoDeLaRed');

let cola: Promise<unknown> = Promise.resolve();

/**
 * Atiende los trabajos de uno en uno. La proyección tiene un solo nombre: dos llamadas
 * a la vez se pisarían, porque una borraría lo que la otra está leyendo.
 * Solo protege este proceso: con varias instancias del backend no alcanzaría.
 */
export function enCola<T>(trabajo: () => Promise<T>): Promise<T> {
  const turno = cola.then(trabajo);
  // Un fallo debe llegar a quien lo pidió, sin dañar la cola para los siguientes.
  cola = turno.catch(() => undefined);
  return turno;
}

// La proyección es una copia: no ve cambios posteriores y se pierde al reiniciar Neo4j.
// Recrearla cuesta unos 10 ms con la semilla; lo lento es Louvain, unos 650 ms.
const sobreRedActual = (algoritmo: string) =>
  enCola(async () => {
    await leer(BORRAR_PROYECCION);
    await leer(CREAR_PROYECCION);
    return { datos: await leer(algoritmo) };
  });

export const usuariosInfluyentes = () => sobreRedActual(INFLUYENTES);

export const comunidadesDetectadas = () => sobreRedActual(COMUNIDADES);

// No usa GDS: lee la base directo, sin esperar la cola.
export async function habilidadesDemandadas() {
  return { datos: await leer(HABILIDADES_DEMANDADAS) };
}

// Tampoco usa GDS. Las comunidades se piden aparte, y el dibujo cruza ambas por id.
export async function grafoDeLaRed() {
  const [grafo] = await leer(GRAFO_DE_LA_RED);
  return grafo;
}
