import { alcance, comunes, distancia, PAGINA, type Entradas } from './entradas.js';

/**
 * Una pregunta, escrita para cada base. Las dos versiones deben devolver lo mismo: columnas en el
 * mismo orden y filas en el mismo orden (por eso todo ORDER BY desempata por id).
 */
export interface Consulta {
  nombre: string;
  descripcion: string;
  /** Escribe en la base: se mide con transacción confirmada y se deshace después. */
  escritura?: boolean;
  cypher?: string;
  sql?: string;
  /** Parámetros de la entrada i. Enteros se convierten a enteros de Neo4j al enviarlos. */
  entrada: (entradas: Entradas, i: number) => Record<string, unknown>;
  /** Los mismos parámetros, en el orden de $1, $2… de la versión SQL. */
  paraSql: (parametros: Record<string, unknown>) => unknown[];
  /** Respuesta correcta calculada en memoria, cuando se puede. */
  esperado?: (entradas: Entradas, parametros: Record<string, unknown>) => unknown[][];
}

const texto = (valor: unknown) => valor as string;

/** Alcance a k saltos: el costo crece con la profundidad, y ahí se separan las dos bases. */
function consultaAlcance(saltos: number): Consulta {
  return {
    nombre: `alcance-${saltos}`,
    descripcion: `Personas distintas a ${saltos} salto${saltos === 1 ? '' : 's'} o menos`,
    // DISTINCT sobre el nodo final permite a Neo4j podar caminos que llegan a alguien ya visto.
    cypher: `MATCH (u:Usuario {id: $a})-[:CONECTA_CON*1..${saltos}]-(o:Usuario)
WHERE o <> u
RETURN count(DISTINCT o) AS personas`,
    // UNION, no UNION ALL: descarta (persona, nivel) repetidos en cada vuelta. Una CTE recursiva no
    // puede consultar lo que ya visitó en vueltas anteriores, así que alguien puede volver a salir
    // en un nivel más profundo; el COUNT DISTINCT final lo cuenta una vez.
    sql: `WITH RECURSIVE alcance(id, nivel) AS (
  SELECT $1::text, 0
  UNION
  SELECT c.contacto_id, a.nivel + 1
  FROM alcance a
  JOIN conexiones c ON c.usuario_id = a.id
  WHERE a.nivel < ${saltos}
)
SELECT count(DISTINCT id) AS personas FROM alcance WHERE id <> $1`,
    entrada: (e, i) => ({ a: e.usuarios[i] }),
    paraSql: (p) => [p.a],
    esperado: (e, p) => [[alcance(e.vecinos, texto(p.a), saltos)]],
  };
}

export const CONSULTAS: Consulta[] = [
  {
    nombre: 'ida-y-vuelta',
    descripcion: 'Consulta trivial: costo fijo de red, protocolo y driver, sin trabajo de la base',
    cypher: 'RETURN 1 AS uno',
    sql: 'SELECT 1 AS uno',
    entrada: () => ({}),
    paraSql: () => [],
  },
  {
    nombre: 'buscar-por-id',
    descripcion: 'Una persona por su id',
    cypher: 'MATCH (u:Usuario {id: $a}) RETURN u.id AS id, u.nombre AS nombre, u.email AS email',
    sql: 'SELECT id, nombre, email FROM usuarios WHERE id = $1',
    entrada: (e, i) => ({ a: e.usuarios[i] }),
    paraSql: (p) => [p.a],
  },
  {
    nombre: 'listar-pagina',
    descripcion: `Página de ${PAGINA} personas ordenadas por id, en una posición al azar`,
    // Sin el WHERE, Neo4j recorre todas las personas y ordena: el índice solo se usa para ordenar
    // si la consulta filtra por esa propiedad. Con él, lee el índice ya ordenado, como Postgres.
    cypher: `MATCH (u:Usuario) WHERE u.id IS NOT NULL RETURN u.id AS id ORDER BY u.id SKIP $salto LIMIT ${PAGINA}`,
    sql: `SELECT id FROM usuarios ORDER BY id OFFSET $1 LIMIT ${PAGINA}`,
    entrada: (e, i) => ({ salto: e.saltos[i] }),
    paraSql: (p) => [p.salto],
  },
  {
    nombre: 'habilidades-demandadas',
    descripcion: 'Las 10 habilidades que más piden las ofertas abiertas',
    cypher: `MATCH (o:Oferta {estado: 'abierta'})-[:REQUIERE]->(h:Habilidad)
RETURN h.id AS id, count(o) AS ofertas
ORDER BY ofertas DESC, id
LIMIT 10`,
    sql: `SELECT r.habilidad_id AS id, count(*) AS ofertas
FROM requiere r
JOIN ofertas o ON o.id = r.oferta_id
WHERE o.estado = 'abierta'
GROUP BY r.habilidad_id
ORDER BY ofertas DESC, id
LIMIT 10`,
    entrada: () => ({}),
    paraSql: () => [],
  },
  {
    nombre: 'contactos-en-comun',
    descripcion: 'Contactos que comparten dos personas',
    cypher: `MATCH (:Usuario {id: $a})-[:CONECTA_CON]-(c:Usuario)-[:CONECTA_CON]-(:Usuario {id: $b})
RETURN c.id AS id
ORDER BY id`,
    sql: `SELECT x.contacto_id AS id
FROM conexiones x
JOIN conexiones y ON y.usuario_id = x.contacto_id AND y.contacto_id = $2
WHERE x.usuario_id = $1
ORDER BY id`,
    entrada: (e, i) => ({ a: e.pares[i]?.[0], b: e.pares[i]?.[1] }),
    paraSql: (p) => [p.a, p.b],
    esperado: (e, p) => comunes(e.vecinos, texto(p.a), texto(p.b)).map((id) => [id]),
  },
  {
    nombre: 'amigos-de-amigos',
    descripcion: 'Sugerencias a dos saltos, por cantidad de contactos en común',
    cypher: `MATCH (u:Usuario {id: $a})-[:CONECTA_CON]-(c:Usuario)-[:CONECTA_CON]-(s:Usuario)
WHERE s <> u AND NOT EXISTS { (u)-[:CONECTA_CON]-(s) }
RETURN s.id AS id, count(DISTINCT c) AS comunes
ORDER BY comunes DESC, id
LIMIT 10`,
    sql: `SELECT y.contacto_id AS id, count(*) AS comunes
FROM conexiones x
JOIN conexiones y ON y.usuario_id = x.contacto_id
WHERE x.usuario_id = $1
  AND y.contacto_id <> $1
  AND NOT EXISTS (SELECT 1 FROM conexiones z WHERE z.usuario_id = $1 AND z.contacto_id = y.contacto_id)
GROUP BY y.contacto_id
ORDER BY comunes DESC, id
LIMIT 10`,
    entrada: (e, i) => ({ a: e.usuarios[i] }),
    paraSql: (p) => [p.a],
  },
  consultaAlcance(1),
  consultaAlcance(2),
  consultaAlcance(3),
  consultaAlcance(4),
  {
    nombre: 'camino',
    descripcion: 'Saltos del camino más corto entre dos personas, hasta 6',
    cypher: `MATCH (a:Usuario {id: $a})
MATCH (b:Usuario {id: $b})
OPTIONAL MATCH ruta = shortestPath((a)-[:CONECTA_CON*..6]-(b))
RETURN length(ruta) AS saltos`,
    // Una CTE recursiva no se detiene al encontrar el destino: recorre los 6 niveles completos
    // y al final toma el mínimo.
    sql: `WITH RECURSIVE bfs(id, nivel) AS (
  SELECT $1::text, 0
  UNION
  SELECT c.contacto_id, b.nivel + 1
  FROM bfs b
  JOIN conexiones c ON c.usuario_id = b.id
  WHERE b.nivel < 6
)
SELECT min(nivel) AS saltos FROM bfs WHERE id = $2`,
    entrada: (e, i) => ({ a: e.pares[i]?.[0], b: e.pares[i]?.[1] }),
    paraSql: (p) => [p.a, p.b],
    esperado: (e, p) => [[distancia(e.vecinos, texto(p.a), texto(p.b), 6)]],
  },
  {
    nombre: 'camino-procedimiento',
    descripcion: 'Lo mismo en PostgreSQL con un procedimiento que hace BFS y se detiene al llegar',
    // La mejor versión relacional: código procedimental (sql/funciones.sql), ya no una consulta.
    sql: 'SELECT camino_bfs($1, $2, 6) AS saltos',
    entrada: (e, i) => ({ a: e.pares[i]?.[0], b: e.pares[i]?.[1] }),
    paraSql: (p) => [p.a, p.b],
    esperado: (e, p) => [[distancia(e.vecinos, texto(p.a), texto(p.b), 6)]],
  },
  {
    nombre: 'candidatos',
    descripcion: 'Candidatos para una oferta: habilidades, contactos en la empresa y ciudad (como la app)',
    cypher: `MATCH (o:Oferta {id: $oferta})<-[:PUBLICA]-(e:Empresa)
MATCH (o)-[r:REQUIERE]->(:Habilidad)<-[t:TIENE_HABILIDAD]-(u:Usuario)
WHERE u.abiertoAOfertas AND t.nivel >= r.nivelMinimo
  AND NOT EXISTS { (u)-[:POSTULA_A]->(o) }
  AND NOT EXISTS { (u)-[:TRABAJA_EN {actual: true}]->(e) }
WITH o, e, u, count(*) AS cumple, count(CASE WHEN r.obligatoria THEN 1 END) AS obligatoriasCumplidas
WITH o, u, cumple, obligatoriasCumplidas,
     COUNT { (o)-[:REQUIERE]->(:Habilidad) } AS requeridas,
     COUNT { (o)-[:REQUIERE {obligatoria: true}]->(:Habilidad) } AS obligatorias,
     COUNT { (u)-[:CONECTA_CON]-(:Usuario)-[:TRABAJA_EN {actual: true}]->(e) } AS contactos,
     EXISTS { (u)-[:VIVE_EN]->(:Ciudad)<-[:UBICADA_EN]-(o) } AS mismaCiudad
RETURN u.id AS id,
       obligatorias - obligatoriasCumplidas AS faltan,
       0.6 * cumple / requeridas
         + 0.3 * (CASE WHEN contactos > 3 THEN 3 ELSE contactos END) / 3.0
         + 0.1 * (CASE WHEN mismaCiudad OR o.modalidad = 'remoto' THEN 1 ELSE 0 END) AS puntaje
ORDER BY faltan, puntaje DESC, id
LIMIT 10`,
    sql: `WITH o AS (SELECT id, empresa_id, ciudad_id, modalidad FROM ofertas WHERE id = $1),
r AS (SELECT habilidad_id, nivel_minimo, obligatoria FROM requiere WHERE oferta_id = $1),
c AS (
  SELECT t.usuario_id, count(*) AS cumple, count(*) FILTER (WHERE r.obligatoria) AS obligatorias_cumplidas
  FROM r
  JOIN tiene_habilidad t ON t.habilidad_id = r.habilidad_id AND t.nivel >= r.nivel_minimo
  JOIN usuarios u ON u.id = t.usuario_id AND u.abierto_a_ofertas
  CROSS JOIN o
  WHERE NOT EXISTS (SELECT 1 FROM postula_a p WHERE p.usuario_id = t.usuario_id AND p.oferta_id = o.id)
    AND NOT EXISTS (
      SELECT 1 FROM trabaja_en w WHERE w.usuario_id = t.usuario_id AND w.empresa_id = o.empresa_id AND w.actual
    )
  GROUP BY t.usuario_id
)
SELECT c.usuario_id AS id,
       (SELECT count(*) FROM r WHERE r.obligatoria) - c.obligatorias_cumplidas AS faltan,
       0.6 * c.cumple::float8 / (SELECT count(*) FROM r)
         + 0.3 * least(k.contactos, 3)::float8 / 3.0
         + 0.1 * (CASE WHEN u.ciudad_id = o.ciudad_id OR o.modalidad = 'remoto' THEN 1 ELSE 0 END) AS puntaje
FROM c
CROSS JOIN o
JOIN usuarios u ON u.id = c.usuario_id
CROSS JOIN LATERAL (
  SELECT count(*) AS contactos
  FROM conexiones x
  JOIN trabaja_en w ON w.usuario_id = x.contacto_id AND w.empresa_id = o.empresa_id AND w.actual
  WHERE x.usuario_id = c.usuario_id
) k
ORDER BY faltan, puntaje DESC, id
LIMIT 10`,
    entrada: (e, i) => ({ oferta: e.ofertas[i] }),
    paraSql: (p) => [p.oferta],
  },
  {
    nombre: 'insertar-conexiones',
    descripcion: 'Escribir 1 000 conexiones nuevas en una transacción',
    escritura: true,
    // La fecha 1900-01-01 marca lo insertado: después se borra para dejar la base como estaba.
    cypher: `UNWIND $pares AS par
MATCH (a:Usuario {id: par[0]})
MATCH (b:Usuario {id: par[1]})
CREATE (a)-[:CONECTA_CON {desde: date('1900-01-01')}]->(b)
RETURN count(*) AS conexiones`,
    // En la tabla cada conexión son dos filas, y las llaves foráneas se revisan al insertar.
    sql: `WITH nuevas AS (SELECT * FROM unnest($1::text[], $2::text[]) AS t(a, b))
INSERT INTO conexiones (usuario_id, contacto_id, desde)
SELECT a, b, DATE '1900-01-01' FROM nuevas
UNION ALL
SELECT b, a, DATE '1900-01-01' FROM nuevas`,
    entrada: (e, i) => ({ pares: e.lotes[i] }),
    paraSql: (p) => {
      const pares = p.pares as [string, string][];
      return [pares.map(([a]) => a), pares.map(([, b]) => b)];
    },
  },
];

export const LIMPIAR_ESCRITURA = {
  cypher: "MATCH ()-[r:CONECTA_CON {desde: date('1900-01-01')}]->() DELETE r",
  sql: "DELETE FROM conexiones WHERE desde = DATE '1900-01-01'",
};
