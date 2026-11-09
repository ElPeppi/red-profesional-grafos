import { readFile } from 'node:fs/promises';
import { archivoDelPaquete, leerEscala } from './archivos.js';
import { conectarPostgres, crearDriverNeo4j } from './bases.js';
import { CONSULTAS, type Consulta } from './consultas.js';
import { CALENTAMIENTO, distancia, prepararEntradas } from './entradas.js';
import { resumirTiempos } from './estadistica.js';
import { generarRed } from './modelo.js';

// Camino más corto en vivo, para la demo: las mismas parejas que mide `npm run medir`, en las dos
// bases, con la respuesta comprobada contra el cálculo en memoria.
//   npm run demo                    100 000 personas, 3 parejas
//   npm run demo -- 10000 5         otra escala y otra cantidad de parejas

const LIMITE_MS = 60_000;
const escala = leerEscala(process.argv[2] ?? '100000');
const cantidad = Number(process.argv[3] ?? 3);
if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 30) throw new Error('Entre 1 y 30 parejas.');

function buscar(nombre: string): Consulta {
  const consulta = CONSULTAS.find((c) => c.nombre === nombre);
  if (!consulta) throw new Error(`No existe la consulta ${nombre} en src/consultas.ts`);
  return consulta;
}
const camino = buscar('camino');
const procedimiento = buscar('camino-procedimiento');

/** Milisegundos como en el documento: coma decimal y espacio de miles. */
function formatoMs(valor: number): string {
  const texto = valor < 10 ? valor.toFixed(1).replace('.', ',') : String(Math.round(valor));
  return texto.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

async function cronometrar<T>(tarea: () => Promise<T>): Promise<[T, number]> {
  const inicio = performance.now();
  const resultado = await tarea();
  return [resultado, performance.now() - inicio];
}

const red = generarRed(escala);
const entradas = prepararEntradas(red);
const nombres = new Map(red.usuarios.map((u) => [u.id, u.nombre]));
const driver = crearDriverNeo4j();
const sesion = driver.session();
const cliente = await conectarPostgres();

try {
  const [enNeo4j] = (await sesion.run('MATCH (u:Usuario) RETURN count(u) AS n')).records.map((r) => r.get('n'));
  const { rows } = await cliente.query('SELECT count(*)::int AS n FROM usuarios');
  if (enNeo4j !== escala || rows[0]?.n !== escala) {
    throw new Error(`Las bases tienen ${enNeo4j} y ${rows[0]?.n} personas, no ${escala}. Corre antes: npm run cargar -- ${escala}`);
  }
  await cliente.query(await readFile(archivoDelPaquete('sql/funciones.sql'), 'utf8'));
  await cliente.query(`SET statement_timeout = ${LIMITE_MS}`);

  const enNeo4jSaltos = async (p: Record<string, unknown>) =>
    (await sesion.run(camino.cypher as string, p, { timeout: LIMITE_MS })).records[0]?.get('saltos') ?? null;
  const enPostgres = async (consulta: Consulta, p: Record<string, unknown>) =>
    (await cliente.query({ name: consulta.nombre, text: consulta.sql as string, values: consulta.paraSql(p) })).rows[0]
      ?.saltos ?? null;

  // Calentar sin mostrar, como en la medición: planes en caché, código compilado y datos en memoria.
  // Neo4j con las 5 entradas de calentamiento, varias vueltas porque cuesta milisegundos; PostgreSQL con
  // dos, porque cada CTE tarda casi un segundo y la demo no puede esperar tanto.
  for (let vuelta = 0; vuelta < 20; vuelta++) {
    for (let i = 0; i < CALENTAMIENTO; i++) await enNeo4jSaltos(camino.entrada(entradas, i));
  }
  for (let i = 0; i < 2; i++) {
    const p = camino.entrada(entradas, i);
    await enPostgres(camino, p);
    await enPostgres(procedimiento, p);
  }

  console.log(`\nCamino más corto con ${formatoMs(escala)} personas (hasta 6 saltos)\n`);
  const tiempos = { neo4j: [] as number[], cte: [] as number[], procedimiento: [] as number[] };
  let todoBien = true;
  for (let i = CALENTAMIENTO; i < CALENTAMIENTO + cantidad; i++) {
    const p = camino.entrada(entradas, i);
    const [a, b] = [p.a as string, p.b as string];
    // Neo4j responde en ~1 ms: una sola medición la mueve cualquier pausa del sistema, sobre todo justo
    // después de pasar casi un segundo inactiva mientras trabaja PostgreSQL. Se mide 5 veces seguidas y
    // se muestra la mediana. PostgreSQL tarda cientos de ms y una medición basta.
    const repeticiones: [unknown, number][] = [];
    for (let r = 0; r < 5; r++) repeticiones.push(await cronometrar(() => enNeo4jSaltos(p)));
    const saltosNeo4j = repeticiones[0]?.[0] ?? null;
    const msNeo4j = resumirTiempos(repeticiones.map(([, ms]) => ms)).mediana;
    const [saltosCte, msCte] = await cronometrar(() => enPostgres(camino, p));
    const [saltosProc, msProc] = await cronometrar(() => enPostgres(procedimiento, p));
    const verdad = distancia(entradas.vecinos, a, b, 6);
    const iguales = [saltosNeo4j, saltosCte, saltosProc].every((s) => s === verdad);
    todoBien &&= iguales;
    tiempos.neo4j.push(msNeo4j);
    tiempos.cte.push(msCte);
    tiempos.procedimiento.push(msProc);

    const saltos = verdad === null ? 'sin camino' : `${verdad} saltos`;
    console.log(`  ${nombres.get(a)} → ${nombres.get(b)} · ${saltos}${iguales ? '' : '  ✗ RESPUESTAS DISTINTAS'}`);
    console.log(`    Neo4j                      ${formatoMs(msNeo4j).padStart(7)} ms`);
    console.log(`    PostgreSQL, CTE recursiva  ${formatoMs(msCte).padStart(7)} ms   ${formatoMs(msCte / msNeo4j)} veces más lento`);
    console.log(`    PostgreSQL, procedimiento  ${formatoMs(msProc).padStart(7)} ms   ${formatoMs(msProc / msNeo4j)} veces más lento\n`);
  }

  console.log(
    `Mediana: Neo4j ${formatoMs(resumirTiempos(tiempos.neo4j).mediana)} ms · CTE ${formatoMs(resumirTiempos(tiempos.cte).mediana)} ms · ` +
      `procedimiento ${formatoMs(resumirTiempos(tiempos.procedimiento).mediana)} ms`,
  );
  console.log(
    todoBien
      ? 'Las tres respuestas coinciden entre sí y con el cálculo en memoria.'
      : 'Alguna respuesta no coincide: revisar la carga (npm run cargar).',
  );
  if (!todoBien) process.exitCode = 1;
} finally {
  await sesion.close();
  await driver.close();
  await cliente.end();
}
