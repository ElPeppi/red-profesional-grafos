// Carga de los CSV en el Neo4j de benchmark. Cada bloque recibe $archivo (file:///<escala>/<nombre>.csv).
// Mismo modelo que la demo: Ciudad y relaciones como en db/01 y db/02.
// CALL { } IN TRANSACTIONS confirma cada 10 000 filas: una sola transacción con un millón de
// relaciones agotaría la memoria. Por eso este archivo se corre con transacciones implícitas.

// @esquema
CREATE CONSTRAINT bench_usuario_id IF NOT EXISTS FOR (n:Usuario) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT bench_usuario_email IF NOT EXISTS FOR (n:Usuario) REQUIRE n.email IS UNIQUE;
CREATE CONSTRAINT bench_empresa_id IF NOT EXISTS FOR (n:Empresa) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT bench_habilidad_id IF NOT EXISTS FOR (n:Habilidad) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT bench_habilidad_nombre IF NOT EXISTS FOR (n:Habilidad) REQUIRE n.nombre IS UNIQUE;
CREATE CONSTRAINT bench_proyecto_id IF NOT EXISTS FOR (n:Proyecto) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT bench_oferta_id IF NOT EXISTS FOR (n:Oferta) REQUIRE n.id IS UNIQUE;
CREATE CONSTRAINT bench_ciudad_id IF NOT EXISTS FOR (n:Ciudad) REQUIRE n.id IS UNIQUE;
CREATE INDEX bench_usuario_nombre IF NOT EXISTS FOR (n:Usuario) ON (n.nombre);
CREATE INDEX bench_empresa_nombre IF NOT EXISTS FOR (n:Empresa) ON (n.nombre);
CREATE INDEX bench_habilidad_categoria IF NOT EXISTS FOR (n:Habilidad) ON (n.categoria);
CREATE INDEX bench_oferta_estado IF NOT EXISTS FOR (n:Oferta) ON (n.estado);

// @ciudades
LOAD CSV WITH HEADERS FROM $archivo AS f
CREATE (:Ciudad {id: f.id, nombre: f.nombre, departamento: f.departamento});

// @habilidades
LOAD CSV WITH HEADERS FROM $archivo AS f
CREATE (:Habilidad {id: f.id, nombre: f.nombre, categoria: f.categoria});

// @usuarios
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (c:Ciudad {id: f.ciudadId})
  CREATE (u:Usuario {
    id: f.id, nombre: f.nombre, email: f.email, titular: f.titular,
    aniosExperiencia: toInteger(f.aniosExperiencia), abiertoAOfertas: f.abiertoAOfertas = 'true'
  })
  CREATE (u)-[:VIVE_EN]->(c)
} IN TRANSACTIONS OF 10000 ROWS;

// @empresas
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (c:Ciudad {id: f.ciudadId})
  CREATE (e:Empresa {id: f.id, nombre: f.nombre, sector: f.sector})
  CREATE (e)-[:UBICADA_EN]->(c)
} IN TRANSACTIONS OF 10000 ROWS;

// @ofertas
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (e:Empresa {id: f.empresaId})
  MATCH (c:Ciudad {id: f.ciudadId})
  CREATE (o:Oferta {
    id: f.id, titulo: f.titulo, nivel: f.nivel, modalidad: f.modalidad,
    estado: f.estado, publicadaEn: date(f.publicadaEn)
  })
  CREATE (e)-[:PUBLICA]->(o)
  CREATE (o)-[:UBICADA_EN]->(c)
} IN TRANSACTIONS OF 10000 ROWS;

// @proyectos
// Un campo vacío del CSV puede llegar como nulo o como texto vacío: se cubren los dos.
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  CREATE (p:Proyecto {id: f.id, nombre: f.nombre, estado: f.estado})
  WITH p, f
  WHERE coalesce(f.empresaId, '') <> ''
  MATCH (e:Empresa {id: f.empresaId})
  CREATE (e)-[:DESARROLLA]->(p)
} IN TRANSACTIONS OF 10000 ROWS;

// @conexiones
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (a:Usuario {id: f.usuarioA})
  MATCH (b:Usuario {id: f.usuarioB})
  CREATE (a)-[:CONECTA_CON {desde: date(f.desde)}]->(b)
} IN TRANSACTIONS OF 10000 ROWS;

// @tiene_habilidad
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (u:Usuario {id: f.usuarioId})
  MATCH (h:Habilidad {id: f.habilidadId})
  CREATE (u)-[:TIENE_HABILIDAD {nivel: toInteger(f.nivel)}]->(h)
} IN TRANSACTIONS OF 10000 ROWS;

// @trabaja_en
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (u:Usuario {id: f.usuarioId})
  MATCH (e:Empresa {id: f.empresaId})
  CREATE (u)-[:TRABAJA_EN {cargo: f.cargo, desde: date(f.desde), actual: f.actual = 'true'}]->(e)
} IN TRANSACTIONS OF 10000 ROWS;

// @participa_en
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (u:Usuario {id: f.usuarioId})
  MATCH (p:Proyecto {id: f.proyectoId})
  CREATE (u)-[:PARTICIPA_EN {rol: f.rol}]->(p)
} IN TRANSACTIONS OF 10000 ROWS;

// @requiere
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (o:Oferta {id: f.ofertaId})
  MATCH (h:Habilidad {id: f.habilidadId})
  CREATE (o)-[:REQUIERE {nivelMinimo: toInteger(f.nivelMinimo), obligatoria: f.obligatoria = 'true'}]->(h)
} IN TRANSACTIONS OF 10000 ROWS;

// @usa
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (p:Proyecto {id: f.proyectoId})
  MATCH (h:Habilidad {id: f.habilidadId})
  CREATE (p)-[:USA]->(h)
} IN TRANSACTIONS OF 10000 ROWS;

// @postula_a
LOAD CSV WITH HEADERS FROM $archivo AS f
CALL (f) {
  MATCH (u:Usuario {id: f.usuarioId})
  MATCH (o:Oferta {id: f.ofertaId})
  CREATE (u)-[:POSTULA_A {fecha: date(f.fecha), estado: f.estado}]->(o)
} IN TRANSACTIONS OF 10000 ROWS;
