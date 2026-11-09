import neo4j from 'neo4j-driver';
import pg from 'pg';

// Credenciales de los contenedores de benchmark (docker-compose.yml, perfil benchmark). Solo locales.

export const crearDriverNeo4j = () =>
  neo4j.driver('bolt://localhost:7688', neo4j.auth.basic('neo4j', 'benchmark123'), {
    disableLosslessIntegers: true,
    maxTransactionRetryTime: 5_000,
  });

export async function conectarPostgres() {
  const cliente = new pg.Client({ host: 'localhost', port: 5433, user: 'postgres', password: 'benchmark123', database: 'red' });
  await cliente.connect();
  return cliente;
}

/** Bloques de un archivo .cypher marcados con // @nombre, igual que el backend. */
export function bloquesCypher(texto: string): Map<string, string[]> {
  const bloques = new Map<string, string[]>();
  for (const parte of texto.split(/^\/\/ @/m).slice(1)) {
    const [nombre = '', ...resto] = parte.split('\n');
    const sentencias = resto
      .join('\n')
      .split(/;\s*$/m)
      .map((s) => s.replace(/^\s*\/\/.*$/gm, '').trim())
      .filter(Boolean);
    bloques.set(nombre.trim(), sentencias);
  }
  return bloques;
}
