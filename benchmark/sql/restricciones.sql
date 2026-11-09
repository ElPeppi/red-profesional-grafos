-- Después de cargar: integridad referencial e índices.
-- Las llaves foráneas son lo que el grafo no tiene: aquí la base garantiza que toda conexión,
-- empleo o postulación apunte a algo que existe. En Neo4j eso lo hace la aplicación.

ALTER TABLE usuarios ADD FOREIGN KEY (ciudad_id) REFERENCES ciudades;
ALTER TABLE empresas ADD FOREIGN KEY (ciudad_id) REFERENCES ciudades;
ALTER TABLE ofertas ADD FOREIGN KEY (empresa_id) REFERENCES empresas;
ALTER TABLE ofertas ADD FOREIGN KEY (ciudad_id) REFERENCES ciudades;
ALTER TABLE proyectos ADD FOREIGN KEY (empresa_id) REFERENCES empresas;
ALTER TABLE conexiones ADD FOREIGN KEY (usuario_id) REFERENCES usuarios ON DELETE CASCADE;
ALTER TABLE conexiones ADD FOREIGN KEY (contacto_id) REFERENCES usuarios ON DELETE CASCADE;
ALTER TABLE tiene_habilidad ADD FOREIGN KEY (usuario_id) REFERENCES usuarios ON DELETE CASCADE;
ALTER TABLE tiene_habilidad ADD FOREIGN KEY (habilidad_id) REFERENCES habilidades;
ALTER TABLE trabaja_en ADD FOREIGN KEY (usuario_id) REFERENCES usuarios ON DELETE CASCADE;
ALTER TABLE trabaja_en ADD FOREIGN KEY (empresa_id) REFERENCES empresas ON DELETE CASCADE;
ALTER TABLE participa_en ADD FOREIGN KEY (usuario_id) REFERENCES usuarios ON DELETE CASCADE;
ALTER TABLE participa_en ADD FOREIGN KEY (proyecto_id) REFERENCES proyectos ON DELETE CASCADE;
ALTER TABLE requiere ADD FOREIGN KEY (oferta_id) REFERENCES ofertas ON DELETE CASCADE;
ALTER TABLE requiere ADD FOREIGN KEY (habilidad_id) REFERENCES habilidades;
ALTER TABLE usa ADD FOREIGN KEY (proyecto_id) REFERENCES proyectos ON DELETE CASCADE;
ALTER TABLE usa ADD FOREIGN KEY (habilidad_id) REFERENCES habilidades;
ALTER TABLE postula_a ADD FOREIGN KEY (usuario_id) REFERENCES usuarios ON DELETE CASCADE;
ALTER TABLE postula_a ADD FOREIGN KEY (oferta_id) REFERENCES ofertas ON DELETE CASCADE;

-- Los mismos únicos e índices que db/01_esquema.cypher da al grafo.
CREATE UNIQUE INDEX ON usuarios (email);
CREATE UNIQUE INDEX ON habilidades (nombre);
CREATE INDEX ON usuarios (nombre);
CREATE INDEX ON empresas (nombre);
CREATE INDEX ON habilidades (categoria);
CREATE INDEX ON ofertas (estado);

-- Índices del otro lado de cada relación. La llave primaria ya cubre (usuario, ...); estos
-- cubren las búsquedas que entran por el otro extremo. Un grafo los tiene gratis: cada
-- relación se recorre desde cualquiera de sus dos nodos.
CREATE INDEX ON usuarios (ciudad_id);
CREATE INDEX ON empresas (ciudad_id);
CREATE INDEX ON ofertas (empresa_id);
CREATE INDEX ON ofertas (ciudad_id);
CREATE INDEX ON proyectos (empresa_id);
CREATE INDEX ON tiene_habilidad (habilidad_id, usuario_id);
CREATE INDEX ON trabaja_en (empresa_id, usuario_id);
CREATE INDEX ON participa_en (proyecto_id, usuario_id);
CREATE INDEX ON requiere (habilidad_id);
CREATE INDEX ON usa (habilidad_id);
CREATE INDEX ON postula_a (oferta_id);

-- Estadísticas para el planificador: sin ellas elegiría planes a ciegas tras la carga.
ANALYZE;
