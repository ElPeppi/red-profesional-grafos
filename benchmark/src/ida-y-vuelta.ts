import { conectarPostgres, crearDriverNeo4j } from './bases.js';
import { resumirTiempos } from './estadistica.js';

// Costo fijo de pedir algo trivial a cada base: red, protocolo y driver, sin trabajo de la base.
// Sirve para no culpar a una base de lo que cuesta solo hablar con ella.

const VECES = 300;

async function medir(nombre: string, tarea: () => Promise<unknown>) {
  for (let i = 0; i < 50; i++) await tarea();
  const tiempos: number[] = [];
  for (let i = 0; i < VECES; i++) {
    const inicio = performance.now();
    await tarea();
    tiempos.push(performance.now() - inicio);
  }
  const { mediana, p95 } = resumirTiempos(tiempos);
  console.log(`${nombre.padEnd(46)} mediana ${String(mediana).padStart(6)} ms   p95 ${String(p95).padStart(6)} ms`);
}

const driver = crearDriverNeo4j();
const sesion = driver.session();
const cliente = await conectarPostgres();
try {
  await medir('neo4j session.run', () => sesion.run('RETURN 1 AS x'));
  await medir('neo4j session.run con timeout', () => sesion.run('RETURN 1 AS x', {}, { timeout: 60_000 }));
  await medir('neo4j executeRead', () => sesion.executeRead((tx) => tx.run('RETURN 1 AS x')));
  await medir('neo4j driver.executeQuery', () => driver.executeQuery('RETURN 1 AS x'));
  await medir('postgres query', () => cliente.query('SELECT 1 AS x'));
  await medir('postgres query preparada', () => cliente.query({ name: 'uno', text: 'SELECT 1 AS x' }));
} finally {
  await sesion.close();
  await driver.close();
  await cliente.end();
}
