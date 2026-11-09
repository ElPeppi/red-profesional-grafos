import { cpus, release, totalmem, type } from 'node:os';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import neo4j, { type Session } from 'neo4j-driver';
import { archivoDelPaquete, carpetaResultados, leerEscala } from './archivos.js';
import { conectarPostgres, crearDriverNeo4j } from './bases.js';
import { CONSULTAS, LIMPIAR_ESCRITURA, type Consulta } from './consultas.js';
import { CALENTAMIENTO, prepararEntradas, REPETICIONES, TOTAL_ENTRADAS } from './entradas.js';
import { iguales, resumirTiempos, type Estadisticas } from './estadistica.js';
import { generarRed } from './modelo.js';

// Mide cada consulta en las dos bases. Antes de medir comprueba que ambas responden lo mismo
// (y lo que da la red en memoria, cuando se puede): si no, el tiempo no significa nada.
//   npm run medir -- 10000                 todas las consultas
//   npm run medir -- 10000 camino alcance-3   solo esas

const LIMITE_MS = 60_000;
const escala = leerEscala(process.argv[2]);
const filtro = process.argv.slice(3);
const consultas = CONSULTAS.filter((c) => filtro.length === 0 || filtro.includes(c.nombre));
if (consultas.length === 0) throw new Error(`Ninguna consulta se llama así. Hay: ${CONSULTAS.map((c) => c.nombre).join(', ')}`);

type Cliente = Awaited<ReturnType<typeof conectarPostgres>>;
type Motor = 'neo4j' | 'postgres';

interface Medicion {
  estado: 'medida' | 'excede el límite' | 'no aplica';
  tiempos?: Estadisticas;
}

class LimiteExcedido extends Error {}

/** Los enteros de JavaScript llegan a Neo4j como Float; SKIP y LIMIT exigen Integer. */
function aNeo4j(parametros: Record<string, unknown>) {
  return Object.fromEntries(
    Object.entries(parametros).map(([k, v]) => [k, typeof v === 'number' && Number.isInteger(v) ? neo4j.int(v) : v]),
  );
}

// PostgreSQL entrega count (bigint) y numeric como texto para no perder precisión.
const NUMERICOS = new Set([20, 1700]);

async function ejecutarNeo4j(sesion: Session, consulta: Consulta, parametros: Record<string, unknown>) {
  const cypher = consulta.cypher as string;
  const opciones = { timeout: LIMITE_MS };
  try {
    const resultado = consulta.escritura
      ? await sesion.executeWrite((tx) => tx.run(cypher, aNeo4j(parametros)), opciones)
      : await sesion.run(cypher, aNeo4j(parametros), opciones);
    return resultado.records.map((r) => r.keys.map((k) => r.get(k)));
  } catch (error) {
    if (String((error as { code?: string }).code).includes('TransactionTimedOut')) throw new LimiteExcedido();
    throw error;
  }
}

async function ejecutarPostgres(cliente: Cliente, consulta: Consulta, parametros: Record<string, unknown>) {
  try {
    // Con nombre: Postgres prepara el plan una vez y lo reusa, como Neo4j con su caché de planes.
    const resultado = await cliente.query({ name: consulta.nombre, text: consulta.sql as string, values: consulta.paraSql(parametros) });
    if (consulta.escritura) return [[(resultado.rowCount ?? 0) / 2]];
    return resultado.rows.map((fila) =>
      resultado.fields.map((campo) => {
        const valor = fila[campo.name];
        return NUMERICOS.has(campo.dataTypeID) && valor !== null ? Number(valor) : valor;
      }),
    );
  } catch (error) {
    if ((error as { code?: string }).code === '57014') throw new LimiteExcedido();
    throw error;
  }
}

async function limpiarEscritura(sesion: Session, cliente: Cliente) {
  await sesion.run(LIMPIAR_ESCRITURA.cypher);
  await cliente.query(LIMPIAR_ESCRITURA.sql);
}

async function cronometrar(tarea: () => Promise<unknown>) {
  const inicio = performance.now();
  await tarea();
  return performance.now() - inicio;
}

// ---------- Planes de ejecución ----------

interface NodoPerfil {
  operatorType: string;
  rows: number;
  dbHits: number;
  arguments: Record<string, unknown>;
  children: NodoPerfil[];
}

function textoDePerfil(nodo: NodoPerfil, sangria = ''): string {
  const detalle = typeof nodo.arguments.Details === 'string' ? ` ${nodo.arguments.Details}` : '';
  const linea = `${sangria}${nodo.operatorType}${detalle}  (filas ${nodo.rows}, db hits ${nodo.dbHits})`;
  return [linea, ...nodo.children.map((hijo) => textoDePerfil(hijo, `${sangria}  `))].join('\n');
}

function totalDbHits(nodo: NodoPerfil): number {
  return nodo.dbHits + nodo.children.reduce((suma, hijo) => suma + totalDbHits(hijo), 0);
}

async function guardarPlanes(sesion: Session, cliente: Cliente, consulta: Consulta, parametros: Record<string, unknown>) {
  const carpeta = join(carpetaResultados(), `planes-${escala}`);
  await mkdir(carpeta, { recursive: true });
  if (consulta.cypher) {
    const resultado = await sesion.run(`PROFILE ${consulta.cypher}`, aNeo4j(parametros), { timeout: LIMITE_MS });
    const perfil = resultado.summary.profile as unknown as NodoPerfil;
    const texto = `${textoDePerfil(perfil)}\n\nTotal db hits: ${totalDbHits(perfil)}\n`;
    await writeFile(join(carpeta, `${consulta.nombre}.neo4j.txt`), texto, 'utf8');
  }
  if (consulta.sql) {
    const resultado = await cliente.query({
      text: `EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${consulta.sql}`,
      values: consulta.paraSql(parametros),
    });
    const texto = resultado.rows.map((fila) => fila['QUERY PLAN']).join('\n');
    await writeFile(join(carpeta, `${consulta.nombre}.postgres.txt`), `${texto}\n`, 'utf8');
  }
}

// ---------- Corrida ----------

const red = generarRed(escala);
const entradas = prepararEntradas(red);
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
  const versiones = {
    neo4j: (await sesion.run('CALL dbms.components() YIELD versions RETURN versions[0] AS v')).records[0]?.get('v'),
    postgres: (await cliente.query('SHOW server_version')).rows[0]?.server_version,
    node: process.version,
  };

  const filas: Record<string, unknown>[] = [];
  const resultados: unknown[] = [];

  for (const consulta of consultas) {
    process.stdout.write(`${consulta.nombre.padEnd(22)}`);
    const medicion: Record<Motor, Medicion> = {
      neo4j: { estado: consulta.cypher ? 'medida' : 'no aplica' },
      postgres: { estado: consulta.sql ? 'medida' : 'no aplica' },
    };

    // Verificar y calentar a la vez: las primeras entradas no se cronometran.
    for (let i = 0; i < CALENTAMIENTO; i++) {
      const parametros = consulta.entrada(entradas, i);
      const respuestas: Partial<Record<Motor, unknown[][]>> = {};
      for (const motor of ['neo4j', 'postgres'] as const) {
        if (medicion[motor].estado !== 'medida') continue;
        try {
          respuestas[motor] =
            motor === 'neo4j' ? await ejecutarNeo4j(sesion, consulta, parametros) : await ejecutarPostgres(cliente, consulta, parametros);
        } catch (error) {
          if (!(error instanceof LimiteExcedido)) throw error;
          medicion[motor] = { estado: 'excede el límite' };
        }
      }
      if (consulta.escritura) await limpiarEscritura(sesion, cliente);

      const esperado = consulta.esperado?.(entradas, parametros);
      const { neo4j: deNeo4j, postgres: dePostgres } = respuestas;
      const errores = [
        deNeo4j && dePostgres && !iguales(deNeo4j, dePostgres) && 'Neo4j y PostgreSQL responden distinto',
        esperado && deNeo4j && !iguales(deNeo4j, esperado) && 'Neo4j no da lo esperado',
        esperado && dePostgres && !iguales(dePostgres, esperado) && 'PostgreSQL no da lo esperado',
      ].filter(Boolean);
      if (errores.length > 0) {
        console.error('\n', { consulta: consulta.nombre, parametros, errores, deNeo4j, dePostgres, esperado });
        throw new Error(`${consulta.nombre}: ${errores.join('; ')}`);
      }
    }

    for (const motor of ['neo4j', 'postgres'] as const) {
      if (medicion[motor].estado !== 'medida') continue;
      const tiempos: number[] = [];
      for (let i = CALENTAMIENTO; i < TOTAL_ENTRADAS; i++) {
        const parametros = consulta.entrada(entradas, i);
        try {
          tiempos.push(
            await cronometrar(() =>
              motor === 'neo4j' ? ejecutarNeo4j(sesion, consulta, parametros) : ejecutarPostgres(cliente, consulta, parametros),
            ),
          );
        } catch (error) {
          if (!(error instanceof LimiteExcedido)) throw error;
          medicion[motor] = { estado: 'excede el límite' };
          break;
        } finally {
          if (consulta.escritura) await limpiarEscritura(sesion, cliente);
        }
      }
      if (medicion[motor].estado === 'medida') medicion[motor].tiempos = resumirTiempos(tiempos);
    }

    if (!consulta.escritura) await guardarPlanes(sesion, cliente, consulta, consulta.entrada(entradas, CALENTAMIENTO));

    const fila = (motor: Motor) => medicion[motor].tiempos?.mediana ?? medicion[motor].estado;
    console.log(`neo4j ${String(fila('neo4j')).padStart(10)}   postgres ${String(fila('postgres')).padStart(10)}`);
    filas.push({ consulta: consulta.nombre, 'neo4j (mediana ms)': fila('neo4j'), 'postgres (mediana ms)': fila('postgres') });
    resultados.push({ nombre: consulta.nombre, descripcion: consulta.descripcion, ...medicion });
  }

  const archivo = join(carpetaResultados(), `consultas-${escala}${filtro.length > 0 ? '-parcial' : ''}.json`);
  await writeFile(
    archivo,
    `${JSON.stringify(
      {
        escala,
        fecha: new Date().toISOString(),
        versiones,
        equipo: { cpu: cpus()[0]?.model, hilos: cpus().length, ramGb: Math.round(totalmem() / 2 ** 30), sistema: `${type()} ${release()}` },
        contenedores: 'cada base: 4 CPU, 5 GB de RAM, 2 GB de caché (docker-compose.yml)',
        metodo: { calentamiento: CALENTAMIENTO, repeticiones: REPETICIONES, limiteMs: LIMITE_MS, cronometro: 'cliente, de enviar a recibir todas las filas' },
        consultas: resultados,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
  console.log(`\nResultados en ${archivo}`);
} finally {
  await sesion.close();
  await driver.close();
  await cliente.end();
}
