import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { archivoDelPaquete, carpetaDatos, carpetaResultados, leerEscala } from './archivos.js';
import { bloquesCypher, conectarPostgres, crearDriverNeo4j } from './bases.js';
import { ordenar, type Resumen } from './resumen.js';

// Carga los CSV de una escala en las dos bases, mide cuánto tarda y comprueba que ambas
// quedaron con lo mismo que dice resumen.json. Si no coinciden, no hay comparación posible.

const escala = leerEscala(process.argv[2]);
const esperado = JSON.parse(await readFile(join(carpetaDatos(escala), 'resumen.json'), 'utf8')) as Resumen;

const ARCHIVOS = [
  'ciudades',
  'habilidades',
  'usuarios',
  'empresas',
  'ofertas',
  'proyectos',
  'conexiones',
  'tiene_habilidad',
  'trabaja_en',
  'participa_en',
  'requiere',
  'usa',
  'postula_a',
];

// Columnas de cada tabla en el orden de su CSV.
const COLUMNAS: Record<string, string> = {
  ciudades: 'id, nombre, departamento',
  habilidades: 'id, nombre, categoria',
  usuarios: 'id, nombre, email, titular, anios_experiencia, abierto_a_ofertas, ciudad_id',
  empresas: 'id, nombre, sector, ciudad_id',
  ofertas: 'id, titulo, nivel, modalidad, estado, publicada_en, empresa_id, ciudad_id',
  proyectos: 'id, nombre, estado, empresa_id',
  conexiones: 'usuario_id, contacto_id, desde',
  tiene_habilidad: 'usuario_id, habilidad_id, nivel',
  trabaja_en: 'usuario_id, empresa_id, cargo, desde, actual',
  participa_en: 'usuario_id, proyecto_id, rol',
  requiere: 'oferta_id, habilidad_id, nivel_minimo, obligatoria',
  usa: 'proyecto_id, habilidad_id',
  postula_a: 'usuario_id, oferta_id, fecha, estado',
};

const cronometro = () => {
  const inicio = performance.now();
  return () => Math.round(performance.now() - inicio);
};

// ---------- Neo4j ----------

async function cargarNeo4j() {
  const driver = crearDriverNeo4j();
  const sesion = driver.session();
  const bloques = bloquesCypher(await readFile(archivoDelPaquete('cypher/carga.cypher'), 'utf8'));
  const pasos: Record<string, number> = {};
  try {
    // Relaciones primero y en lotes: DETACH DELETE de 10 000 nodos arrastra cientos de miles de
    // relaciones en una sola transacción y agota la memoria de transacciones (lo hizo con 100 000 personas).
    const limpiar = cronometro();
    await sesion.run('MATCH ()-[r]->() CALL (r) { DELETE r } IN TRANSACTIONS OF 20000 ROWS');
    await sesion.run('MATCH (n) CALL (n) { DELETE n } IN TRANSACTIONS OF 20000 ROWS');
    pasos.limpiar = limpiar();

    const total = cronometro();
    for (const sentencia of bloques.get('esquema') ?? []) await sesion.run(sentencia);
    await sesion.run('CALL db.awaitIndexes(300)');
    for (const archivo of ARCHIVOS) {
      const paso = cronometro();
      for (const sentencia of bloques.get(archivo) ?? []) {
        await sesion.run(sentencia, { archivo: `file:///${escala}/${archivo}.csv` });
      }
      pasos[archivo] = paso();
    }
    pasos.total = total();

    const resumen = await resumenNeo4j(sesion);
    const version = (await sesion.run('CALL dbms.components() YIELD versions RETURN versions[0] AS v')).records[0]?.get('v');
    return { resumen, pasos, version };
  } finally {
    await sesion.close();
    await driver.close();
  }
}

async function resumenNeo4j(sesion: ReturnType<ReturnType<typeof crearDriverNeo4j>['session']>): Promise<Resumen> {
  const uno = async (consulta: string) => (await sesion.run(consulta)).records[0]?.toObject() ?? {};
  const conteos = await uno(`RETURN
    COUNT { (:Usuario) } AS usuarios, COUNT { (:Empresa) } AS empresas, COUNT { (:Oferta) } AS ofertas,
    COUNT { (:Proyecto) } AS proyectos, COUNT { ()-[:CONECTA_CON]->() } AS conexiones,
    COUNT { ()-[:TIENE_HABILIDAD]->() } AS tieneHabilidad, COUNT { ()-[:TRABAJA_EN]->() } AS trabajaEn,
    COUNT { ()-[:PARTICIPA_EN]->() } AS participaEn, COUNT { ()-[:REQUIERE]->() } AS requiere,
    COUNT { ()-[:USA]->() } AS usa, COUNT { ()-[:POSTULA_A]->() } AS postulaA,
    COUNT { (:Oferta {estado: 'abierta'}) } AS ofertasAbiertas,
    COUNT { (p:Proyecto) WHERE NOT EXISTS { (:Empresa)-[:DESARROLLA]->(p) } } AS proyectosComunitarios,
    COUNT { ()-[:TRABAJA_EN {actual: true}]->() } AS empleosActuales`);
  const extra = await uno(`
    CALL () { MATCH (u:Usuario) RETURN max(COUNT { (u)-[:CONECTA_CON]-() }) AS gradoMaximo }
    CALL () { MATCH ()-[t:TIENE_HABILIDAD]->() RETURN sum(t.nivel) AS sumaNiveles }
    RETURN gradoMaximo, sumaNiveles`);
  const ciudades = await sesion.run('MATCH (:Usuario)-[:VIVE_EN]->(c:Ciudad) RETURN c.id AS id, count(*) AS n');
  return {
    ...(conteos as Omit<Resumen, 'personasPorCiudad' | 'gradoMaximo' | 'sumaNiveles'>),
    gradoMaximo: extra.gradoMaximo ?? 0,
    sumaNiveles: extra.sumaNiveles ?? 0,
    personasPorCiudad: ordenar(Object.fromEntries(ciudades.records.map((r) => [r.get('id'), r.get('n')]))),
  };
}

// ---------- PostgreSQL ----------

async function cargarPostgres() {
  const cliente = await conectarPostgres();
  const pasos: Record<string, number> = {};
  try {
    const limpiar = cronometro();
    await cliente.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    pasos.limpiar = limpiar();

    const total = cronometro();
    await cliente.query(await readFile(archivoDelPaquete('sql/esquema.sql'), 'utf8'));
    for (const archivo of ARCHIVOS) {
      const paso = cronometro();
      await cliente.query(
        `COPY ${archivo} (${COLUMNAS[archivo]}) FROM '/datos/${escala}/${archivo}.csv' WITH (FORMAT csv, HEADER true)`,
      );
      if (archivo === 'conexiones') {
        // El CSV trae cada conexión una vez; la tabla la guarda en los dos sentidos.
        await cliente.query('INSERT INTO conexiones SELECT contacto_id, usuario_id, desde FROM conexiones');
      }
      pasos[archivo] = paso();
    }
    const restricciones = cronometro();
    await cliente.query(await readFile(archivoDelPaquete('sql/restricciones.sql'), 'utf8'));
    pasos.restricciones = restricciones();
    pasos.total = total();

    const resumen = await resumenPostgres(cliente);
    const version = (await cliente.query('SHOW server_version')).rows[0]?.server_version;
    return { resumen, pasos, version };
  } finally {
    await cliente.end();
  }
}

async function resumenPostgres(cliente: Awaited<ReturnType<typeof conectarPostgres>>): Promise<Resumen> {
  const { rows } = await cliente.query(`SELECT
    (SELECT count(*) FROM usuarios) AS usuarios, (SELECT count(*) FROM empresas) AS empresas,
    (SELECT count(*) FROM ofertas) AS ofertas, (SELECT count(*) FROM proyectos) AS proyectos,
    (SELECT count(*) / 2 FROM conexiones) AS conexiones, (SELECT count(*) FROM tiene_habilidad) AS "tieneHabilidad",
    (SELECT count(*) FROM trabaja_en) AS "trabajaEn", (SELECT count(*) FROM participa_en) AS "participaEn",
    (SELECT count(*) FROM requiere) AS requiere, (SELECT count(*) FROM usa) AS usa,
    (SELECT count(*) FROM postula_a) AS "postulaA",
    (SELECT count(*) FROM ofertas WHERE estado = 'abierta') AS "ofertasAbiertas",
    (SELECT count(*) FROM proyectos WHERE empresa_id IS NULL) AS "proyectosComunitarios",
    (SELECT count(*) FROM trabaja_en WHERE actual) AS "empleosActuales",
    (SELECT coalesce(max(grado), 0) FROM (SELECT count(*) AS grado FROM conexiones GROUP BY usuario_id) g) AS "gradoMaximo",
    (SELECT coalesce(sum(nivel), 0) FROM tiene_habilidad) AS "sumaNiveles"`);
  const ciudades = await cliente.query('SELECT ciudad_id AS id, count(*) AS n FROM usuarios GROUP BY ciudad_id');
  // count devuelve bigint, que pg entrega como texto para no perder precisión.
  const numeros = Object.fromEntries(Object.entries(rows[0] ?? {}).map(([k, v]) => [k, Number(v)]));
  return {
    ...(numeros as Omit<Resumen, 'personasPorCiudad'>),
    personasPorCiudad: ordenar(Object.fromEntries(ciudades.rows.map((r) => [r.id, Number(r.n)]))),
  };
}

// ---------- Comparación ----------

const CLAVES: (keyof Resumen)[] = Object.keys(esperado) as (keyof Resumen)[];
const comoTexto = (r: Resumen) => JSON.stringify(Object.fromEntries(CLAVES.map((k) => [k, r[k]])));

console.log(`Cargando ${escala} personas…`);
const neo = await cargarNeo4j();
console.log(`Neo4j ${neo.version}: ${neo.pasos.total} ms`);
const sql = await cargarPostgres();
console.log(`PostgreSQL ${sql.version}: ${sql.pasos.total} ms`);

const diferencias = CLAVES.filter(
  (k) => JSON.stringify(neo.resumen[k]) !== JSON.stringify(esperado[k]) || JSON.stringify(sql.resumen[k]) !== JSON.stringify(esperado[k]),
).map((k) => ({ dato: k, esperado: esperado[k], neo4j: neo.resumen[k], postgres: sql.resumen[k] }));

await mkdir(carpetaResultados(), { recursive: true });
await writeFile(
  join(carpetaResultados(), `carga-${escala}.json`),
  `${JSON.stringify({ escala, fecha: new Date().toISOString(), neo4j: neo, postgres: sql, coinciden: diferencias.length === 0 }, null, 2)}\n`,
  'utf8',
);

if (diferencias.length > 0) {
  console.error('Las bases NO tienen los mismos datos:');
  console.table(diferencias);
  process.exitCode = 1;
} else {
  console.log(`Las dos bases coinciden con resumen.json: ${comoTexto(esperado).length} caracteres de huella iguales.`);
}
