// =====================================================================
// 04_operaciones.cypher
// Operaciones de la aplicación: crean, cambian y borran datos.
// El backend carga cada bloque por su marca // @nombre.
// NO se ejecuta completo con cypher-shell -f: no trae valores de ejemplo
// porque cada parámetro llega desde la aplicación.
//
// Enteros: el backend los envía con neo4j.int(). Un número normal de JavaScript
// llega como Float, y aniosExperiencia quedaría guardado como 3.0 en vez de 3.
// =====================================================================


// =====================================================================
// USUARIOS
// =====================================================================

// ---------- Crear usuario ----------
// Empieza en la ciudad: si no existe, el MATCH no da filas, no se crea nada y el
// backend responde con un error. datetime() usa la hora del servidor.
// @crearUsuario
MATCH (c:Ciudad {id: $ciudadId})
CREATE (u:Usuario {
  id: $id,
  nombre: $nombre,
  email: $email,
  titular: $titular,
  aniosExperiencia: $aniosExperiencia,
  abiertoAOfertas: $abiertoAOfertas,
  creadoEn: datetime()
})
CREATE (u)-[:VIVE_EN]->(c)
RETURN u {
  .id, .nombre, .email, .titular, .aniosExperiencia, .abiertoAOfertas, .creadoEn,
  ciudad: c { .id, .nombre, .departamento }
} AS usuario;


// ---------- Listar usuarios ----------
// Paginación con SKIP y LIMIT. El orden fijo evita repetir o saltar filas entre páginas.
// @listarUsuarios
MATCH (u:Usuario)-[:VIVE_EN]->(c:Ciudad)
RETURN u {
  .id, .nombre, .email, .titular, .aniosExperiencia, .abiertoAOfertas, .creadoEn,
  ciudad: c { .id, .nombre, .departamento }
} AS usuario
ORDER BY u.nombre, u.id
SKIP $salto
LIMIT $limite;

// @contarUsuarios
MATCH (u:Usuario)
RETURN count(u) AS total;


// ---------- Buscar usuarios por nombre o titular ----------
// Usa el índice de texto completo busqueda_usuarios. $termino va en sintaxis Lucene:
// el backend limpia la entrada y arma la búsqueda por prefijo y con tolerancia a errores.
// @buscarUsuarios
CALL db.index.fulltext.queryNodes('busqueda_usuarios', $termino)
YIELD node AS u, score
MATCH (u)-[:VIVE_EN]->(c:Ciudad)
RETURN u {
  .id, .nombre, .email, .titular, .aniosExperiencia, .abiertoAOfertas, .creadoEn,
  ciudad: c { .id, .nombre, .departamento }
} AS usuario
ORDER BY score DESC, u.nombre, u.id
SKIP $salto
LIMIT $limite;

// @contarBusquedaUsuarios
CALL db.index.fulltext.queryNodes('busqueda_usuarios', $termino)
YIELD node
RETURN count(node) AS total;


// ---------- Perfil completo de un usuario ----------
// Datos personales y profesionales: habilidades, empleos, proyectos y tamaño de su red.
// @obtenerUsuario
MATCH (u:Usuario {id: $id})-[:VIVE_EN]->(c:Ciudad)
RETURN u {
  .id, .nombre, .email, .titular, .aniosExperiencia, .abiertoAOfertas, .creadoEn,
  ciudad: c { .id, .nombre, .departamento },
  habilidades: COLLECT {
    MATCH (u)-[t:TIENE_HABILIDAD]->(h:Habilidad)
    RETURN h { .id, .nombre, .categoria, nivel: t.nivel }
    ORDER BY t.nivel DESC, h.nombre
  },
  empleos: COLLECT {
    MATCH (u)-[t:TRABAJA_EN]->(e:Empresa)
    RETURN e { .id, .nombre, cargo: t.cargo, desde: t.desde, actual: t.actual }
    ORDER BY t.desde DESC, e.nombre, e.id
  },
  proyectos: COLLECT {
    MATCH (u)-[p:PARTICIPA_EN]->(pr:Proyecto)
    RETURN pr { .id, .nombre, .estado, rol: p.rol }
    ORDER BY pr.nombre, pr.id
  },
  totalConexiones: COUNT { (u)-[:CONECTA_CON]-(:Usuario) }
} AS usuario;


// ---------- Actualizar usuario ----------
// += solo cambia las propiedades que llegan en $cambios; las demás quedan igual.
// @actualizarUsuario
MATCH (u:Usuario {id: $id})-[:VIVE_EN]->(c:Ciudad)
SET u += $cambios
RETURN u {
  .id, .nombre, .email, .titular, .aniosExperiencia, .abiertoAOfertas, .creadoEn,
  ciudad: c { .id, .nombre, .departamento }
} AS usuario;


// ---------- Cambiar la ciudad de un usuario ----------
// Las relaciones no se editan: se borra la anterior y se crea otra.
// @cambiarCiudadUsuario
MATCH (u:Usuario {id: $id})-[r:VIVE_EN]->(:Ciudad)
MATCH (c:Ciudad {id: $ciudadId})
DELETE r
CREATE (u)-[:VIVE_EN]->(c)
RETURN u.id AS id;


// ---------- Eliminar usuario ----------
// DETACH DELETE borra el nodo y todas sus relaciones: conexiones, postulaciones, etc.
// @eliminarUsuario
MATCH (u:Usuario {id: $id})
DETACH DELETE u
RETURN count(u) AS eliminados;


// =====================================================================
// RED: SOLICITUDES Y CONEXIONES
// =====================================================================

// Las fechas usan la zona de Colombia. date() a secas usaría la del contenedor (UTC),
// donde después de las 7 p. m. ya es el día siguiente.

// ---------- Estado entre dos usuarios ----------
// Antes de crear una solicitud, para explicar por qué no se puede.
// Sin filas: alguno de los dos usuarios no existe.
// @estadoDeConexion
MATCH (a:Usuario {id: $solicitanteId})
MATCH (b:Usuario {id: $destinoId})
RETURN EXISTS { (a)-[:CONECTA_CON]-(b) } AS conectados,
       EXISTS { (a)-[:SOLICITA_CONEXION]->(b) } AS solicitudEnviada,
       EXISTS { (b)-[:SOLICITA_CONEXION]->(a) } AS solicitudRecibida;


// ---------- Crear solicitud de conexión ----------
// MERGE crea la relación solo si no existe. Neo4j bloquea los dos nodos mientras
// decide, así que dos clics simultáneos dejan una sola solicitud.
// @crearSolicitud
MATCH (a:Usuario {id: $solicitanteId})
MATCH (b:Usuario {id: $destinoId})
MERGE (a)-[s:SOLICITA_CONEXION]->(b)
ON CREATE SET s.fecha = date({timezone: 'America/Bogota'})
RETURN a.id AS solicitanteId, b.id AS destinoId, s.fecha AS fecha;


// ---------- Aceptar solicitud ----------
// Una sentencia Cypher es una transacción: o se borra la solicitud y se crea la
// conexión, o no pasa nada. Nunca queda una sin la otra.
// El MERGE va sin flecha porque CONECTA_CON es mutua: evita duplicarla aunque
// lleguen dos aceptaciones a la vez. También borra una solicitud en sentido contrario.
// @aceptarSolicitud
MATCH (a:Usuario {id: $solicitanteId})-[s:SOLICITA_CONEXION]->(b:Usuario {id: $destinoId})
OPTIONAL MATCH (b)-[inversa:SOLICITA_CONEXION]->(a)
DELETE s, inversa
MERGE (a)-[c:CONECTA_CON]-(b)
ON CREATE SET c.desde = date({timezone: 'America/Bogota'})
RETURN a.id AS solicitanteId, b.id AS destinoId, c.desde AS desde;


// ---------- Rechazar o cancelar solicitud ----------
// @eliminarSolicitud
MATCH (:Usuario {id: $solicitanteId})-[s:SOLICITA_CONEXION]->(:Usuario {id: $destinoId})
DELETE s
RETURN count(s) AS eliminadas;


// ---------- Solicitudes pendientes de un usuario ----------
// Sin filas: el usuario no existe. Con listas vacías: existe y no tiene pendientes.
// @listarSolicitudes
MATCH (u:Usuario {id: $id})
RETURN COLLECT {
         MATCH (o:Usuario)-[s:SOLICITA_CONEXION]->(u)
         RETURN o { .id, .nombre, .titular, fecha: s.fecha }
         ORDER BY s.fecha DESC, o.nombre, o.id
       } AS recibidas,
       COLLECT {
         MATCH (u)-[s:SOLICITA_CONEXION]->(o:Usuario)
         RETURN o { .id, .nombre, .titular, fecha: s.fecha }
         ORDER BY s.fecha DESC, o.nombre, o.id
       } AS enviadas;


// ---------- Conexiones de un usuario ----------
// Patrón sin flecha: da igual quién envió la solicitud original.
// Sin filas: el usuario no existe.
// @listarConexiones
MATCH (u:Usuario {id: $id})
RETURN COUNT { (u)-[:CONECTA_CON]-(:Usuario) } AS total,
       COLLECT {
         MATCH (u)-[c:CONECTA_CON]-(o:Usuario)-[:VIVE_EN]->(ci:Ciudad)
         RETURN o { .id, .nombre, .titular, ciudad: ci.nombre, desde: c.desde }
         ORDER BY o.nombre, o.id
         SKIP $salto
         LIMIT $limite
       } AS datos;


// =====================================================================
// VÍNCULOS DEL USUARIO: HABILIDADES, EMPLEOS Y PROYECTOS
// =====================================================================

// Poner: MERGE crea la relación si falta y SET deja las propiedades enviadas, así que
// repetir la llamada da el mismo resultado (operación idempotente).
// Sin filas: falta alguno de los dos nodos.
// Quitar: count siempre devuelve una fila; 0 significa que el vínculo no existía.

// ---------- Habilidades del usuario ----------
// @ponerHabilidadUsuario
MATCH (u:Usuario {id: $usuarioId})
MATCH (h:Habilidad {id: $habilidadId})
MERGE (u)-[t:TIENE_HABILIDAD]->(h)
SET t.nivel = $nivel
RETURN h { .id, .nombre, .categoria, nivel: t.nivel } AS habilidad;

// @quitarHabilidadUsuario
MATCH (:Usuario {id: $usuarioId})-[t:TIENE_HABILIDAD]->(:Habilidad {id: $habilidadId})
DELETE t
RETURN count(t) AS eliminadas;


// ---------- Empleos del usuario ----------
// Una relación por pareja usuario-empresa: volver a la misma empresa actualiza el empleo.
// date($desde) convierte el texto a tipo Date: guardado como texto no se podría comparar
// ni restar como fecha.
// @ponerEmpleo
MATCH (u:Usuario {id: $usuarioId})
MATCH (e:Empresa {id: $empresaId})
MERGE (u)-[t:TRABAJA_EN]->(e)
SET t.cargo = $cargo, t.desde = date($desde), t.actual = $actual
RETURN e { .id, .nombre, cargo: t.cargo, desde: t.desde, actual: t.actual } AS empleo;

// @quitarEmpleo
MATCH (:Usuario {id: $usuarioId})-[t:TRABAJA_EN]->(:Empresa {id: $empresaId})
DELETE t
RETURN count(t) AS eliminadas;


// ---------- Proyectos del usuario ----------
// @ponerParticipacion
MATCH (u:Usuario {id: $usuarioId})
MATCH (p:Proyecto {id: $proyectoId})
MERGE (u)-[t:PARTICIPA_EN]->(p)
SET t.rol = $rol
RETURN p { .id, .nombre, .estado, rol: t.rol } AS proyecto;

// @quitarParticipacion
MATCH (:Usuario {id: $usuarioId})-[t:PARTICIPA_EN]->(:Proyecto {id: $proyectoId})
DELETE t
RETURN count(t) AS eliminadas;


// =====================================================================
// EMPRESAS
// =====================================================================

// ---------- Crear empresa ----------
// @crearEmpresa
MATCH (c:Ciudad {id: $ciudadId})
CREATE (e:Empresa {id: $id, nombre: $nombre, sector: $sector})
CREATE (e)-[:UBICADA_EN]->(c)
RETURN e { .id, .nombre, .sector, ciudad: c { .id, .nombre, .departamento } } AS empresa;


// ---------- Listar empresas ----------
// Un solo recorrido da el total y la página. collect() carga todas las filas antes de
// cortar: va bien para catálogos pequeños como empresas, ofertas y proyectos.
// @listarEmpresas
MATCH (e:Empresa)-[:UBICADA_EN]->(c:Ciudad)
WITH e, c ORDER BY e.nombre, e.id
WITH collect(e { .id, .nombre, .sector, ciudad: c { .id, .nombre, .departamento } }) AS filas
RETURN size(filas) AS total, filas[$salto .. $salto + $limite] AS datos;


// ---------- Perfil de una empresa ----------
// @obtenerEmpresa
MATCH (e:Empresa {id: $id})-[:UBICADA_EN]->(c:Ciudad)
RETURN e {
  .id, .nombre, .sector,
  ciudad: c { .id, .nombre, .departamento },
  ofertas: COLLECT {
    MATCH (e)-[:PUBLICA]->(o:Oferta)
    RETURN o { .id, .titulo, .estado, .publicadaEn }
    ORDER BY o.publicadaEn DESC, o.titulo, o.id
  },
  proyectos: COLLECT {
    MATCH (e)-[:DESARROLLA]->(p:Proyecto)
    RETURN p { .id, .nombre, .estado }
    ORDER BY p.nombre, p.id
  },
  totalEmpleados: COUNT { (:Usuario)-[:TRABAJA_EN {actual: true}]->(e) }
} AS empresa;


// ---------- Actualizar empresa ----------
// @actualizarEmpresa
MATCH (e:Empresa {id: $id})-[:UBICADA_EN]->(c:Ciudad)
SET e += $cambios
RETURN e { .id, .nombre, .sector, ciudad: c { .id, .nombre, .departamento } } AS empresa;

// @cambiarCiudadEmpresa
MATCH (e:Empresa {id: $id})-[r:UBICADA_EN]->(:Ciudad)
MATCH (c:Ciudad {id: $ciudadId})
DELETE r
CREATE (e)-[:UBICADA_EN]->(c)
RETURN e.id AS id;


// ---------- Eliminar empresa ----------
// Un grafo no tiene llaves foráneas: DETACH DELETE dejaría ofertas sin empresa, y las
// consultas ya no las verían. Por eso, con ofertas no se borra y se devuelve cuántas tiene.
// Sus proyectos siguen vivos, sin empresa, igual que los comunitarios.
// @eliminarEmpresa
MATCH (e:Empresa {id: $id})
WITH e, COUNT { (e)-[:PUBLICA]->(:Oferta) } AS ofertas
FOREACH (_ IN CASE WHEN ofertas = 0 THEN [1] ELSE [] END | DETACH DELETE e)
RETURN ofertas;


// =====================================================================
// OFERTAS
// =====================================================================

// ---------- Crear oferta ----------
// Sin filas: no existe la empresa o la ciudad, y no se crea nada.
// @crearOferta
MATCH (e:Empresa {id: $empresaId})
MATCH (c:Ciudad {id: $ciudadId})
CREATE (o:Oferta {
  id: $id,
  titulo: $titulo,
  nivel: $nivel,
  modalidad: $modalidad,
  estado: 'abierta',
  publicadaEn: date({timezone: 'America/Bogota'})
})
CREATE (e)-[:PUBLICA]->(o)
CREATE (o)-[:UBICADA_EN]->(c)
RETURN o {
  .id, .titulo, .nivel, .modalidad, .estado, .publicadaEn,
  empresa: e { .id, .nombre },
  ciudad: c { .id, .nombre }
} AS oferta;


// ---------- Listar ofertas ----------
// $estado es opcional: si llega nulo, la condición deja pasar todas.
// @listarOfertas
MATCH (e:Empresa)-[:PUBLICA]->(o:Oferta)-[:UBICADA_EN]->(c:Ciudad)
WHERE $estado IS NULL OR o.estado = $estado
WITH e, o, c ORDER BY o.publicadaEn DESC, o.titulo, o.id
WITH collect(o {
  .id, .titulo, .nivel, .modalidad, .estado, .publicadaEn,
  empresa: e { .id, .nombre },
  ciudad: c { .id, .nombre }
}) AS filas
RETURN size(filas) AS total, filas[$salto .. $salto + $limite] AS datos;


// ---------- Detalle de una oferta ----------
// Las habilidades obligatorias van primero.
// @obtenerOferta
MATCH (e:Empresa)-[:PUBLICA]->(o:Oferta {id: $id})-[:UBICADA_EN]->(c:Ciudad)
RETURN o {
  .id, .titulo, .nivel, .modalidad, .estado, .publicadaEn,
  empresa: e { .id, .nombre },
  ciudad: c { .id, .nombre },
  habilidades: COLLECT {
    MATCH (o)-[r:REQUIERE]->(h:Habilidad)
    RETURN h { .id, .nombre, .categoria, nivelMinimo: r.nivelMinimo, obligatoria: r.obligatoria }
    ORDER BY r.obligatoria DESC, h.nombre
  },
  totalPostulaciones: COUNT { (:Usuario)-[:POSTULA_A]->(o) }
} AS oferta;


// ---------- Actualizar oferta ----------
// Cerrarla es cambiar estado: las postulaciones quedan y sale de las recomendaciones.
// @actualizarOferta
MATCH (e:Empresa)-[:PUBLICA]->(o:Oferta {id: $id})-[:UBICADA_EN]->(c:Ciudad)
SET o += $cambios
RETURN o {
  .id, .titulo, .nivel, .modalidad, .estado, .publicadaEn,
  empresa: e { .id, .nombre },
  ciudad: c { .id, .nombre }
} AS oferta;

// @cambiarCiudadOferta
MATCH (o:Oferta {id: $id})-[r:UBICADA_EN]->(:Ciudad)
MATCH (c:Ciudad {id: $ciudadId})
DELETE r
CREATE (o)-[:UBICADA_EN]->(c)
RETURN o.id AS id;


// ---------- Eliminar oferta ----------
// Borra también sus requisitos y postulaciones. Para conservarlas, mejor cerrarla.
// @eliminarOferta
MATCH (o:Oferta {id: $id})
DETACH DELETE o
RETURN count(o) AS eliminadas;


// ---------- Habilidades que pide una oferta ----------
// @ponerHabilidadOferta
MATCH (o:Oferta {id: $ofertaId})
MATCH (h:Habilidad {id: $habilidadId})
MERGE (o)-[r:REQUIERE]->(h)
SET r.nivelMinimo = $nivelMinimo, r.obligatoria = $obligatoria
RETURN h { .id, .nombre, .categoria, nivelMinimo: r.nivelMinimo, obligatoria: r.obligatoria } AS habilidad;

// @quitarHabilidadOferta
MATCH (:Oferta {id: $ofertaId})-[r:REQUIERE]->(:Habilidad {id: $habilidadId})
DELETE r
RETURN count(r) AS eliminadas;


// =====================================================================
// POSTULACIONES
// =====================================================================

// ---------- Estado antes de postularse ----------
// Para explicar por qué no se puede. Sin filas: no existe el usuario o la oferta.
// @estadoDePostulacion
MATCH (u:Usuario {id: $usuarioId})
MATCH (o:Oferta {id: $ofertaId})
RETURN o.estado AS estadoOferta, EXISTS { (u)-[:POSTULA_A]->(o) } AS yaPostulado;


// ---------- Crear postulación ----------
// MERGE, igual que las solicitudes: dos clics simultáneos dejan una sola postulación.
// @crearPostulacion
MATCH (u:Usuario {id: $usuarioId})
MATCH (o:Oferta {id: $ofertaId})
MERGE (u)-[p:POSTULA_A]->(o)
ON CREATE SET p.fecha = date({timezone: 'America/Bogota'}), p.estado = 'enviada'
RETURN u.id AS usuarioId, o.id AS ofertaId, p.fecha AS fecha, p.estado AS estado;


// ---------- Cambiar estado de una postulación ----------
// @cambiarEstadoPostulacion
MATCH (u:Usuario {id: $usuarioId})-[p:POSTULA_A]->(o:Oferta {id: $ofertaId})
SET p.estado = $estado
RETURN u.id AS usuarioId, o.id AS ofertaId, p.fecha AS fecha, p.estado AS estado;


// ---------- Postulantes de una oferta ----------
// Sin filas: la oferta no existe. Con lista vacía: existe y nadie se ha postulado.
// @postulantesDeOferta
MATCH (o:Oferta {id: $ofertaId})
RETURN COLLECT {
  MATCH (u:Usuario)-[p:POSTULA_A]->(o)
  RETURN u { .id, .nombre, .titular, fecha: p.fecha, estado: p.estado }
  ORDER BY p.fecha DESC, u.nombre, u.id
} AS postulantes;


// ---------- Postulaciones de un usuario ----------
// @postulacionesDeUsuario
MATCH (u:Usuario {id: $usuarioId})
RETURN COLLECT {
  MATCH (u)-[p:POSTULA_A]->(o:Oferta)<-[:PUBLICA]-(e:Empresa)
  RETURN o { .id, .titulo, estadoOferta: o.estado, empresa: e.nombre, fecha: p.fecha, estado: p.estado }
  ORDER BY p.fecha DESC, o.titulo, o.id
} AS postulaciones;


// =====================================================================
// PROYECTOS
// =====================================================================

// ---------- Crear proyecto ----------
// La empresa es opcional: los proyectos comunitarios no tienen.
// OPTIONAL MATCH deja e en nulo. Si se pidió una empresa y no existe, el WHERE corta
// aquí y no se crea nada. FOREACH es el truco de Cypher para un "if" dentro de una escritura.
// @crearProyecto
OPTIONAL MATCH (e:Empresa {id: $empresaId})
WITH e
WHERE e IS NOT NULL OR $empresaId IS NULL
CREATE (p:Proyecto {id: $id, nombre: $nombre, descripcion: $descripcion, estado: $estado})
FOREACH (_ IN CASE WHEN e IS NULL THEN [] ELSE [1] END | CREATE (e)-[:DESARROLLA]->(p))
RETURN p { .id, .nombre, .descripcion, .estado, empresa: e { .id, .nombre } } AS proyecto;


// ---------- Listar proyectos ----------
// @listarProyectos
MATCH (p:Proyecto)
WITH p ORDER BY p.nombre, p.id
WITH collect(p {
  .id, .nombre, .descripcion, .estado,
  empresa: head(COLLECT { MATCH (e:Empresa)-[:DESARROLLA]->(p) RETURN e { .id, .nombre } })
}) AS filas
RETURN size(filas) AS total, filas[$salto .. $salto + $limite] AS datos;


// ---------- Detalle de un proyecto ----------
// @obtenerProyecto
MATCH (p:Proyecto {id: $id})
RETURN p {
  .id, .nombre, .descripcion, .estado,
  empresa: head(COLLECT { MATCH (e:Empresa)-[:DESARROLLA]->(p) RETURN e { .id, .nombre } }),
  tecnologias: COLLECT {
    MATCH (p)-[:USA]->(h:Habilidad)
    RETURN h { .id, .nombre, .categoria }
    ORDER BY h.nombre
  },
  miembros: COLLECT {
    MATCH (u:Usuario)-[t:PARTICIPA_EN]->(p)
    RETURN u { .id, .nombre, .titular, rol: t.rol }
    ORDER BY u.nombre, u.id
  }
} AS proyecto;


// ---------- Actualizar proyecto ----------
// @actualizarProyecto
MATCH (p:Proyecto {id: $id})
SET p += $cambios
RETURN p {
  .id, .nombre, .descripcion, .estado,
  empresa: head(COLLECT { MATCH (e:Empresa)-[:DESARROLLA]->(p) RETURN e { .id, .nombre } })
} AS proyecto;


// ---------- Eliminar proyecto ----------
// @eliminarProyecto
MATCH (p:Proyecto {id: $id})
DETACH DELETE p
RETURN count(p) AS eliminados;


// ---------- Tecnologías de un proyecto ----------
// @ponerTecnologia
MATCH (p:Proyecto {id: $proyectoId})
MATCH (h:Habilidad {id: $habilidadId})
MERGE (p)-[:USA]->(h)
RETURN h { .id, .nombre, .categoria } AS habilidad;

// @quitarTecnologia
MATCH (:Proyecto {id: $proyectoId})-[u:USA]->(:Habilidad {id: $habilidadId})
DELETE u
RETURN count(u) AS eliminadas;


// =====================================================================
// CATÁLOGOS
// =====================================================================

// Listas completas y cortas, para los selectores del frontend. Sin paginación.

// @listarCiudades
MATCH (c:Ciudad)
RETURN c { .id, .nombre, .departamento } AS ciudad
ORDER BY c.nombre;

// @listarHabilidades
MATCH (h:Habilidad)
RETURN h { .id, .nombre, .categoria } AS habilidad
ORDER BY h.categoria, h.nombre;


// =====================================================================
// RED PARA DIBUJAR
// =====================================================================

// Personas, empresas y ofertas con lo que las une, de una sola vez para el dibujo.
// Son los mismos tipos que recorren las consultas de caminos: toda ruta cabe en este grafo.
// CONECTA_CON se guarda una vez, así que no sale repetida; DISTINCT cubre a quien tuvo dos
// empleos en la misma empresa.
// Ordenados por id: el dibujo parte de las posiciones iniciales en el orden de los nodos, así
// que sin orden explícito cambiaba cada vez que se recargaba la semilla.
// @grafoDeLaRed
MATCH (n:Usuario|Empresa|Oferta)
WITH n ORDER BY n.id
WITH collect(n { .id, nombre: coalesce(n.nombre, n.titulo), tipo: labels(n)[0] }) AS nodos
RETURN nodos, COLLECT {
  MATCH (a)-[r:CONECTA_CON|TRABAJA_EN|PUBLICA]->(b)
  WITH DISTINCT a.id AS origen, b.id AS destino, type(r) AS tipo
  RETURN { origen: origen, destino: destino, tipo: tipo } ORDER BY origen, destino, tipo
} AS aristas;
