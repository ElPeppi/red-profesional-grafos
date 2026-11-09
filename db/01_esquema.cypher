// =====================================================================
// 01_esquema.cypher
// Esquema de la red profesional: constraints de unicidad e índices.
//
// Neo4j es "schema-optional": no obliga a declarar tablas ni columnas,
// pero sí permite reglas que protegen la calidad de los datos.
// - Una CONSTRAINT de unicidad equivale a la PK / UNIQUE de SQL y, además,
//   crea automáticamente un índice sobre esa propiedad.
// - Un INDEX acelera la búsqueda del nodo donde EMPIEZA una consulta.
//   Después de ese punto, Neo4j recorre relaciones sin usar índices
//   ("index-free adjacency"): cada nodo apunta directamente a sus vecinos.
// IF NOT EXISTS hace que el script se pueda correr varias veces sin error.
// =====================================================================

// ---------- Unicidad (equivalente a PK / UNIQUE) ----------
CREATE CONSTRAINT usuario_id IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.id IS UNIQUE;

CREATE CONSTRAINT usuario_email IF NOT EXISTS
FOR (u:Usuario) REQUIRE u.email IS UNIQUE;

CREATE CONSTRAINT empresa_id IF NOT EXISTS
FOR (e:Empresa) REQUIRE e.id IS UNIQUE;

CREATE CONSTRAINT habilidad_id IF NOT EXISTS
FOR (h:Habilidad) REQUIRE h.id IS UNIQUE;

CREATE CONSTRAINT habilidad_nombre IF NOT EXISTS
FOR (h:Habilidad) REQUIRE h.nombre IS UNIQUE;

CREATE CONSTRAINT proyecto_id IF NOT EXISTS
FOR (p:Proyecto) REQUIRE p.id IS UNIQUE;

CREATE CONSTRAINT oferta_id IF NOT EXISTS
FOR (o:Oferta) REQUIRE o.id IS UNIQUE;

CREATE CONSTRAINT ciudad_id IF NOT EXISTS
FOR (c:Ciudad) REQUIRE c.id IS UNIQUE;

// ---------- Índices para filtros frecuentes ----------
CREATE INDEX usuario_nombre IF NOT EXISTS
FOR (u:Usuario) ON (u.nombre);

CREATE INDEX empresa_nombre IF NOT EXISTS
FOR (e:Empresa) ON (e.nombre);

CREATE INDEX habilidad_categoria IF NOT EXISTS
FOR (h:Habilidad) ON (h.categoria);

CREATE INDEX oferta_estado IF NOT EXISTS
FOR (o:Oferta) ON (o.estado);

// ---------- Índice de texto completo (buscador de la app) ----------
// Permite búsquedas tipo "contiene" y tolerantes a errores sobre nombre y titular,
// como el buscador de personas de LinkedIn.
CREATE FULLTEXT INDEX busqueda_usuarios IF NOT EXISTS
FOR (u:Usuario) ON EACH [u.nombre, u.titular];

// ---------- Verificación ----------
SHOW CONSTRAINTS YIELD name, labelsOrTypes, properties
RETURN name, labelsOrTypes, properties
ORDER BY name;
