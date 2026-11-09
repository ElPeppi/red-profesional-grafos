import neo4j, { type ManagedTransaction } from 'neo4j-driver';
import { config } from './config.js';

// El driver es costoso de crear y guarda el pool de conexiones: se comparte uno solo.
// disableLosslessIntegers: Neo4j usa enteros de 64 bits y JavaScript no; con esta opción
// el driver devuelve number en vez de su propia clase Integer.
// maxTransactionRetryTime: por defecto reintenta 30 s, así que con Neo4j caído cada petición
// se quedaba colgada más de 45 s antes de responder. Para un choque pasajero, 5 s bastan.
const driver = neo4j.driver(config.NEO4J_URI, neo4j.auth.basic(config.NEO4J_USUARIO, config.NEO4J_PASSWORD), {
  disableLosslessIntegers: true,
  maxTransactionRetryTime: 5_000,
});

// Community tiene una sola base de datos de usuario.
const BASE = 'neo4j';

type Fila = Record<string, unknown>;

/** Convierte tipos propios del driver a valores que JSON puede representar. */
export function aJson(valor: unknown): unknown {
  if (Array.isArray(valor)) return valor.map(aJson);
  if (neo4j.isDateTime(valor)) return valor.toStandardDate().toISOString();
  if (neo4j.isDate(valor)) return valor.toString();
  if (valor !== null && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([clave, v]) => [clave, aJson(v)]));
  }
  return valor;
}

/** Los number de JavaScript llegan a Neo4j como Float: los enteros deben pasar por aquí. */
export const entero = (valor: number) => neo4j.int(valor);

export async function leer(consulta: string, parametros: Fila = {}): Promise<Fila[]> {
  const { records } = await driver.executeQuery(consulta, parametros, {
    database: BASE,
    routing: neo4j.routing.READ,
  });
  return records.map((r) => aJson(r.toObject()) as Fila);
}

export async function escribir(consulta: string, parametros: Fila = {}): Promise<Fila[]> {
  const { records } = await driver.executeQuery(consulta, parametros, {
    database: BASE,
    routing: neo4j.routing.WRITE,
  });
  return records.map((r) => aJson(r.toObject()) as Fila);
}

/**
 * Agrupa varias escrituras en una transacción: o pasan todas, o ninguna.
 * Si la función lanza un error se revierte todo. El driver reintenta solo ante
 * fallos temporales, por eso la función no debe tener efectos fuera de la transacción.
 */
export async function enTransaccion<T>(trabajo: (tx: ManagedTransaction) => Promise<T>): Promise<T> {
  const sesion = driver.session({ database: BASE });
  try {
    return await sesion.executeWrite(trabajo);
  } finally {
    await sesion.close();
  }
}

/** Filas de una consulta dentro de una transacción ya abierta. */
export async function enTx(tx: ManagedTransaction, consulta: string, parametros: Fila = {}): Promise<Fila[]> {
  const { records } = await tx.run(consulta, parametros);
  return records.map((r) => aJson(r.toObject()) as Fila);
}

export async function versionNeo4j(): Promise<string> {
  const info = await driver.getServerInfo({ database: BASE });
  return info.agent ?? 'desconocida';
}

export async function cerrarDriver(): Promise<void> {
  await driver.close();
}
