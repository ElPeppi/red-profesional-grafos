-- Esquema relacional equivalente al grafo de la red profesional.
-- Las tablas se crean solo con llave primaria: llaves foráneas e índices secundarios van
-- después de cargar (restricciones.sql). Es la práctica normal en cargas masivas: validar
-- e indexar una vez al final cuesta mucho menos que hacerlo fila por fila.

CREATE TABLE ciudades (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  departamento text NOT NULL
);

CREATE TABLE habilidades (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  categoria text NOT NULL
);

CREATE TABLE usuarios (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  email text NOT NULL,
  titular text NOT NULL,
  anios_experiencia integer NOT NULL,
  abierto_a_ofertas boolean NOT NULL,
  ciudad_id text NOT NULL
);

CREATE TABLE empresas (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  sector text NOT NULL,
  ciudad_id text NOT NULL
);

CREATE TABLE ofertas (
  id text PRIMARY KEY,
  titulo text NOT NULL,
  nivel text NOT NULL,
  modalidad text NOT NULL,
  estado text NOT NULL CHECK (estado IN ('abierta', 'cerrada')),
  publicada_en date NOT NULL,
  empresa_id text NOT NULL,
  ciudad_id text NOT NULL
);

-- empresa_id nulo: proyecto comunitario.
CREATE TABLE proyectos (
  id text PRIMARY KEY,
  nombre text NOT NULL,
  estado text NOT NULL,
  empresa_id text
);

-- Una conexión es simétrica y se guarda en los dos sentidos: (a, b) y (b, a). Duplica filas,
-- pero cada salto es un solo join por índice y no un OR o un UNION. Es como lo modelaría un
-- DBA que quiere recorrer la red rápido: a Postgres le damos su mejor diseño.
CREATE TABLE conexiones (
  usuario_id text NOT NULL,
  contacto_id text NOT NULL,
  desde date NOT NULL,
  PRIMARY KEY (usuario_id, contacto_id),
  CHECK (usuario_id <> contacto_id)
);

CREATE TABLE tiene_habilidad (
  usuario_id text NOT NULL,
  habilidad_id text NOT NULL,
  nivel smallint NOT NULL CHECK (nivel BETWEEN 1 AND 5),
  PRIMARY KEY (usuario_id, habilidad_id)
);

CREATE TABLE trabaja_en (
  usuario_id text NOT NULL,
  empresa_id text NOT NULL,
  cargo text NOT NULL,
  desde date NOT NULL,
  actual boolean NOT NULL,
  PRIMARY KEY (usuario_id, empresa_id)
);

CREATE TABLE participa_en (
  usuario_id text NOT NULL,
  proyecto_id text NOT NULL,
  rol text NOT NULL,
  PRIMARY KEY (usuario_id, proyecto_id)
);

CREATE TABLE requiere (
  oferta_id text NOT NULL,
  habilidad_id text NOT NULL,
  nivel_minimo smallint NOT NULL CHECK (nivel_minimo BETWEEN 1 AND 5),
  obligatoria boolean NOT NULL,
  PRIMARY KEY (oferta_id, habilidad_id)
);

CREATE TABLE usa (
  proyecto_id text NOT NULL,
  habilidad_id text NOT NULL,
  PRIMARY KEY (proyecto_id, habilidad_id)
);

CREATE TABLE postula_a (
  usuario_id text NOT NULL,
  oferta_id text NOT NULL,
  fecha date NOT NULL,
  estado text NOT NULL,
  PRIMARY KEY (usuario_id, oferta_id)
);
