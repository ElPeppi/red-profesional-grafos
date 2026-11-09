// =====================================================================
// 00_limpiar.cypher
// Borra TODOS los nodos y relaciones para volver a cargar desde cero.
// No borra constraints ni índices (esos los maneja 01_esquema.cypher).
// Útil antes de la demo para dejar la base en un estado conocido.
// =====================================================================

// DETACH DELETE borra el nodo junto con todas sus relaciones.
// CALL { ... } IN TRANSACTIONS borra por lotes para no agotar la memoria
// si la base es grande (por ejemplo, después de cargar el generador masivo).
// Si lo pegas en Neo4j Browser, anteponle ":auto " para que corra como transacción implícita.
MATCH (n)
CALL {
  WITH n
  DETACH DELETE n
} IN TRANSACTIONS OF 10000 ROWS;
