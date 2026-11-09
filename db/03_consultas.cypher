// =====================================================================
// 03_consultas.cypher
// Consultas de la red profesional: preguntas del enunciado, recomendaciones,
// caminos y analítica con Graph Data Science (GDS).
// Solo lee datos: no crea, cambia ni borra nodos o relaciones. El CRUD y la
// aceptación de solicitudes van en el backend. La única excepción es la
// proyección de GDS (consulta 11), que vive en memoria, fuera de la base.
//
// Cada consulta usa parámetros ($usuarioId, $ofertaId...): el valor llega
// aparte de la consulta. Así Neo4j reutiliza el plan de ejecución y se evita
// la inyección de código, igual que las "prepared statements" de SQL.
// La línea :param de cada bloque fija un valor de ejemplo; cámbiala para
// probar otros casos. Requiere haber cargado 01_esquema y 02_datos_semilla.
// La marca // @nombre identifica cada consulta: así la carga el backend, de modo
// que este archivo es lo que corre la aplicación y no una copia.
//
// Mismos datos, misma respuesta: sin un orden explícito, collect() y COLLECT { }
// devuelven las filas en el orden en que Neo4j guardó los datos, y ese orden
// cambia al volver a cargar la semilla. Por eso cada lista se ordena antes de
// juntarla (por nombre, y por id si hay homónimos), y cada ORDER BY final
// desempata hasta el último campo.
//
// Bloques:  A. Preguntas del enunciado (1 a 6)
//           B. Recomendaciones y caminos (7 a 10)
//           C. Analítica con GDS (11 a 13)
// =====================================================================


// =====================================================================
// A. PREGUNTAS DEL ENUNCIADO
// =====================================================================

// ---------- 1. ¿Qué usuarios tienen habilidades similares? ----------
// @usuariosSimilares
// Similitud de Jaccard: habilidades compartidas / habilidades distintas entre
// los dos. Va de 0 (nada en común) a 1 (mismas habilidades). Dividir por el
// total evita favorecer a quien simplemente declara muchas habilidades.
:param usuarioId => 'usr-16'

MATCH (u:Usuario {id: $usuarioId})-[:TIENE_HABILIDAD]->(h:Habilidad)<-[:TIENE_HABILIDAD]-(otro:Usuario)
WITH u, otro, h ORDER BY h.nombre
WITH u, otro, collect(h.nombre) AS compartidas
WITH otro, compartidas,
     COUNT { (u)-[:TIENE_HABILIDAD]->(:Habilidad) } AS totalPropias,
     COUNT { (otro)-[:TIENE_HABILIDAD]->(:Habilidad) } AS totalOtro
RETURN otro.id AS id,
       otro.nombre AS usuario,
       compartidas,
       round(1.0 * size(compartidas) / (totalPropias + totalOtro - size(compartidas)), 2) AS jaccard
ORDER BY jaccard DESC, size(compartidas) DESC, usuario, id
LIMIT 10;


// ---------- 2. ¿Qué contactos en común existen entre dos profesionales? ----------
// @contactosEnComun
// CONECTA_CON se guarda una sola vez, por eso el patrón va sin flecha.
:param usuarioId => 'usr-15'
:param otroUsuarioId => 'usr-20'

MATCH (:Usuario {id: $usuarioId})-[:CONECTA_CON]-(comun:Usuario)-[:CONECTA_CON]-(:Usuario {id: $otroUsuarioId})
RETURN comun.id AS id, comun.nombre AS contacto, comun.titular AS titular
ORDER BY contacto, id;


// ---------- 3. ¿Cuál es la ruta más corta entre un usuario y una empresa? ----------
// @rutaAEmpresa
// allShortestPaths recorre el grafo por capas (BFS) desde los dos extremos y se
// detiene en la primera capa donde se encuentran: trae todas las rutas de ese
// largo mínimo. Se elige la primera por ids, para que con varias rutas igual de
// cortas la respuesta no dependa del orden en que Neo4j guardó los datos
// (shortestPath devolvería cualquiera). TRABAJA_EN incluye empleos anteriores,
// así que la ruta también puede pasar por excompañeros. *..8 limita la búsqueda
// a 8 saltos. Sin ruta (usuario sin conexiones) devuelve 0 filas.
:param usuarioId => 'usr-38'
:param empresaId => 'emp-06'

MATCH (u:Usuario {id: $usuarioId})
MATCH (e:Empresa {id: $empresaId})
MATCH ruta = allShortestPaths((u)-[:CONECTA_CON|TRABAJA_EN*..8]-(e))
WITH ruta ORDER BY [n IN nodes(ruta) | n.id]
LIMIT 1
RETURN length(ruta) AS saltos,
       [n IN nodes(ruta) | n.nombre] AS camino,
       [r IN relationships(ruta) | type(r)] AS relaciones,
       [n IN nodes(ruta) | n { .id, .nombre, tipo: labels(n)[0] }] AS nodos;


// ---------- 4. ¿Qué candidatos recomendar para una oferta? ----------
// @candidatosParaOferta
// Recomendación híbrida y explicable: mezcla competencias con conexiones y
// devuelve el porqué de cada candidato.
//   - Excluye a quien ya se postuló, ya trabaja en la empresa o no está abierto a ofertas.
//   - Una habilidad solo cuenta si el nivel alcanza el mínimo pedido.
//   - Puntaje: 60% habilidades + 30% contactos en la empresa (tope 3) + 10% ciudad.
//     En ofertas remotas la ciudad no resta.
//   - Orden lexicográfico: primero por cuántas obligatorias le faltan (menos es mejor:
//     restricción dura), luego el puntaje (señales blandas). Así un buen contacto no
//     tapa una habilidad obligatoria que falta.
//   - Los contactos se cuentan por persona (WITH DISTINCT c) y no por nombre:
//     dos homónimos son dos contactos.
:param ofertaId => 'of-06'

MATCH (e:Empresa)-[:PUBLICA]->(o:Oferta {id: $ofertaId})
WHERE o.estado = 'abierta'
MATCH (o)-[req:REQUIERE]->(hr:Habilidad)
WITH e, o, req, hr ORDER BY hr.nombre
WITH e, o,
     collect(hr.nombre) AS requeridas,
     collect(CASE WHEN req.obligatoria THEN hr.nombre END) AS obligatorias
MATCH (u:Usuario)-[t:TIENE_HABILIDAD]->(h:Habilidad)<-[r:REQUIERE]-(o)
WHERE u.abiertoAOfertas = true
  AND t.nivel >= r.nivelMinimo
  AND NOT EXISTS { (u)-[:POSTULA_A]->(o) }
  AND NOT EXISTS { (u)-[:TRABAJA_EN {actual: true}]->(e) }
WITH e, o, requeridas, obligatorias, u, h ORDER BY h.nombre
WITH e, o, requeridas, obligatorias, u, collect(h.nombre) AS cumple
WITH o, requeridas, u, cumple,
     [x IN requeridas WHERE NOT x IN cumple] AS faltan,
     [x IN obligatorias WHERE NOT x IN cumple] AS faltanObligatorias,
     COLLECT {
       MATCH (u)-[:CONECTA_CON]-(c:Usuario)-[:TRABAJA_EN {actual: true}]->(e)
       WITH DISTINCT c
       RETURN c.nombre ORDER BY c.nombre, c.id
     } AS contactosEnEmpresa,
     EXISTS { (u)-[:VIVE_EN]->(:Ciudad)<-[:UBICADA_EN]-(o) } AS mismaCiudad
WITH u, cumple, faltan, faltanObligatorias, contactosEnEmpresa, mismaCiudad,
     1.0 * size(cumple) / size(requeridas) AS coberturaHabilidades,
     CASE WHEN size(contactosEnEmpresa) >= 3 THEN 1.0
          ELSE size(contactosEnEmpresa) / 3.0 END AS fuerzaRed,
     CASE WHEN mismaCiudad OR o.modalidad = 'remoto' THEN 1.0 ELSE 0.0 END AS ajusteCiudad
RETURN u.id AS id,
       u.nombre AS candidato,
       round(100 * (0.6 * coberturaHabilidades + 0.3 * fuerzaRed + 0.1 * ajusteCiudad)) AS puntaje,
       cumple,
       faltan,
       faltanObligatorias,
       contactosEnEmpresa,
       mismaCiudad
ORDER BY size(faltanObligatorias), puntaje DESC, candidato, id
LIMIT 10;


// ---------- 5. ¿Qué proyectos comparten tecnologías o miembros relacionados? ----------
// @proyectosRelacionados
// Compara cada par de proyectos una sola vez (p1.id < p2.id evita A-B y B-A).
// Miembros en común: la misma persona participa en ambos.
// Miembros conectados: dos personas unidas por CONECTA_CON, cada una solo en uno
// de los proyectos. Sin esa condición, un miembro compartido contaría a todos sus
// compañeros de equipo como enlace entre proyectos.
MATCH (p1:Proyecto)
MATCH (p2:Proyecto)
WHERE p1.id < p2.id
WITH p1, p2,
     COLLECT { MATCH (p1)-[:USA]->(h:Habilidad)<-[:USA]-(p2) RETURN h.nombre ORDER BY h.nombre } AS tecnologias,
     COLLECT {
       MATCH (p1)<-[:PARTICIPA_EN]-(m:Usuario)-[:PARTICIPA_EN]->(p2)
       RETURN m.nombre ORDER BY m.nombre, m.id
     } AS miembrosEnComun,
     COLLECT {
       MATCH (p1)<-[:PARTICIPA_EN]-(a:Usuario)-[:CONECTA_CON]-(b:Usuario)-[:PARTICIPA_EN]->(p2)
       WHERE NOT EXISTS { (a)-[:PARTICIPA_EN]->(p2) }
         AND NOT EXISTS { (b)-[:PARTICIPA_EN]->(p1) }
       RETURN a.nombre + ' - ' + b.nombre ORDER BY a.nombre, b.nombre, a.id, b.id
     } AS miembrosConectados
WHERE size(tecnologias) > 0 OR size(miembrosEnComun) > 0 OR size(miembrosConectados) > 0
RETURN p1.id AS id1,
       p1.nombre AS proyecto1,
       p2.id AS id2,
       p2.nombre AS proyecto2,
       tecnologias,
       miembrosEnComun,
       miembrosConectados
ORDER BY size(tecnologias) DESC, size(miembrosEnComun) DESC, size(miembrosConectados) DESC, proyecto1, proyecto2, id1, id2
LIMIT 10;


// ---------- 6. ¿Qué habilidades son las más demandadas en las ofertas? ----------
// @habilidadesDemandadas
// Solo ofertas abiertas. "profesionales" muestra cuánta gente la tiene: una
// habilidad muy pedida y con pocos profesionales es una brecha de talento.
MATCH (:Oferta {estado: 'abierta'})-[r:REQUIERE]->(h:Habilidad)
RETURN h.nombre AS habilidad,
       h.categoria AS categoria,
       count(r) AS ofertas,
       count(CASE WHEN r.obligatoria THEN 1 END) AS obligatoria,
       round(avg(r.nivelMinimo), 1) AS nivelMinimoPromedio,
       COUNT { (:Usuario)-[:TIENE_HABILIDAD]->(h) } AS profesionales
ORDER BY ofertas DESC, obligatoria DESC, habilidad
LIMIT 10;


// =====================================================================
// B. RECOMENDACIONES Y CAMINOS
// =====================================================================

// ---------- 7. Recomendación de contactos ----------
// @recomendarContactos
// Cierre triádico: si A conoce a B y B conoce a C, es probable que A y C se
// conecten. Los contactos en común pesan más (3), luego empresa actual o
// anterior compartida (2), y habilidades y ciudad suman 1 cada una.
// El UNION junta candidatos de cada señal, así también funciona para usuarios
// nuevos sin conexiones (problema de "arranque en frío" o cold start).
// Excluye a quien ya es contacto o tiene una solicitud pendiente en cualquier sentido.
:param usuarioId => 'usr-39'

MATCH (u:Usuario {id: $usuarioId})
CALL (u) {
  MATCH (u)-[:CONECTA_CON]-(:Usuario)-[:CONECTA_CON]-(s:Usuario) RETURN s
  UNION
  MATCH (u)-[:TRABAJA_EN]->(:Empresa)<-[:TRABAJA_EN]-(s:Usuario) RETURN s
  UNION
  MATCH (u)-[:TIENE_HABILIDAD]->(:Habilidad)<-[:TIENE_HABILIDAD]-(s:Usuario) RETURN s
  UNION
  MATCH (u)-[:VIVE_EN]->(:Ciudad)<-[:VIVE_EN]-(s:Usuario) RETURN s
}
WITH u, s
WHERE s <> u
  AND NOT EXISTS { (u)-[:CONECTA_CON]-(s) }
  AND NOT EXISTS { (u)-[:SOLICITA_CONEXION]-(s) }
WITH s,
     COLLECT {
       MATCH (u)-[:CONECTA_CON]-(c:Usuario)-[:CONECTA_CON]-(s) RETURN c.nombre ORDER BY c.nombre, c.id
     } AS contactosEnComun,
     COLLECT {
       MATCH (u)-[:TRABAJA_EN]->(e:Empresa)<-[:TRABAJA_EN]-(s) WITH DISTINCT e RETURN e.nombre ORDER BY e.nombre, e.id
     } AS empresasEnComun,
     COLLECT {
       MATCH (u)-[:TIENE_HABILIDAD]->(h:Habilidad)<-[:TIENE_HABILIDAD]-(s) RETURN h.nombre ORDER BY h.nombre
     } AS habilidadesEnComun,
     EXISTS { (u)-[:VIVE_EN]->(:Ciudad)<-[:VIVE_EN]-(s) } AS mismaCiudad
RETURN s.id AS id,
       s.nombre AS sugerido,
       s.titular AS titular,
       3 * size(contactosEnComun) + 2 * size(empresasEnComun) + size(habilidadesEnComun)
         + CASE WHEN mismaCiudad THEN 1 ELSE 0 END AS puntaje,
       contactosEnComun,
       empresasEnComun,
       habilidadesEnComun,
       mismaCiudad
ORDER BY puntaje DESC, sugerido, id
LIMIT 10;


// ---------- 8. Recomendación de empleos para un usuario ----------
// @recomendarEmpleos
// Inversa de la consulta 4, con las mismas reglas y el mismo puntaje: si un
// candidato sale para una oferta, esa oferta sale para el candidato con igual
// puntaje. Aquí no se filtra abiertoAOfertas: es el usuario quien está buscando.
// Solo usa habilidades, así que funciona sin conexiones (cold start).
:param usuarioId => 'usr-39'

MATCH (u:Usuario {id: $usuarioId})-[t:TIENE_HABILIDAD]->(h:Habilidad)<-[r:REQUIERE]-(o:Oferta {estado: 'abierta'})<-[:PUBLICA]-(e:Empresa)
WHERE t.nivel >= r.nivelMinimo
  AND NOT EXISTS { (u)-[:POSTULA_A]->(o) }
  AND NOT EXISTS { (u)-[:TRABAJA_EN {actual: true}]->(e) }
WITH u, e, o, h ORDER BY h.nombre
WITH u, e, o, collect(h.nombre) AS cumple
WITH u, e, o, cumple,
     COLLECT { MATCH (o)-[:REQUIERE]->(x:Habilidad) RETURN x.nombre ORDER BY x.nombre } AS requeridas,
     COLLECT { MATCH (o)-[:REQUIERE {obligatoria: true}]->(x:Habilidad) RETURN x.nombre ORDER BY x.nombre } AS obligatorias
WITH e, o, requeridas, cumple,
     [x IN requeridas WHERE NOT x IN cumple] AS faltan,
     [x IN obligatorias WHERE NOT x IN cumple] AS faltanObligatorias,
     COLLECT {
       MATCH (u)-[:CONECTA_CON]-(c:Usuario)-[:TRABAJA_EN {actual: true}]->(e)
       WITH DISTINCT c
       RETURN c.nombre ORDER BY c.nombre, c.id
     } AS contactosEnEmpresa,
     EXISTS { (u)-[:VIVE_EN]->(:Ciudad)<-[:UBICADA_EN]-(o) } AS mismaCiudad
WITH e, o, cumple, faltan, faltanObligatorias, contactosEnEmpresa, mismaCiudad,
     1.0 * size(cumple) / size(requeridas) AS coberturaHabilidades,
     CASE WHEN size(contactosEnEmpresa) >= 3 THEN 1.0
          ELSE size(contactosEnEmpresa) / 3.0 END AS fuerzaRed,
     CASE WHEN mismaCiudad OR o.modalidad = 'remoto' THEN 1.0 ELSE 0.0 END AS ajusteCiudad
RETURN o.id AS id,
       o.titulo AS oferta,
       e.nombre AS empresa,
       o.modalidad AS modalidad,
       round(100 * (0.6 * coberturaHabilidades + 0.3 * fuerzaRed + 0.1 * ajusteCiudad)) AS puntaje,
       cumple,
       faltan,
       faltanObligatorias,
       contactosEnEmpresa,
       mismaCiudad
ORDER BY size(faltanObligatorias), puntaje DESC, oferta, id
LIMIT 10;


// ---------- 9. Recomendación de colaboradores para un proyecto ----------
// @recomendarColaboradores
// Personas fuera del proyecto con las tecnologías que usa. Puntaje: 70% tecnologías
// cubiertas + 30% contactos entre los miembros (tope 3). Solo proyectos en curso:
// uno finalizado no busca colaboradores.
:param proyectoId => 'prj-07'

MATCH (p:Proyecto {id: $proyectoId})-[:USA]->(h:Habilidad)<-[:TIENE_HABILIDAD]-(u:Usuario)
WHERE p.estado = 'en curso'
  AND NOT EXISTS { (u)-[:PARTICIPA_EN]->(p) }
WITH p, u, h ORDER BY h.nombre
WITH p, u, collect(h.nombre) AS habilidadesUtiles
WITH u, habilidadesUtiles,
     COLLECT {
       MATCH (u)-[:CONECTA_CON]-(m:Usuario)-[:PARTICIPA_EN]->(p)
       WITH DISTINCT m
       RETURN m.nombre ORDER BY m.nombre, m.id
     } AS contactosEnProyecto,
     COUNT { (p)-[:USA]->(:Habilidad) } AS totalTecnologias
WITH u, habilidadesUtiles, contactosEnProyecto,
     1.0 * size(habilidadesUtiles) / totalTecnologias AS coberturaTecnologias,
     CASE WHEN size(contactosEnProyecto) >= 3 THEN 1.0
          ELSE size(contactosEnProyecto) / 3.0 END AS fuerzaRed
RETURN u.id AS id,
       u.nombre AS colaborador,
       u.titular AS titular,
       round(100 * (0.7 * coberturaTecnologias + 0.3 * fuerzaRed)) AS puntaje,
       habilidadesUtiles,
       contactosEnProyecto
ORDER BY puntaje DESC, colaborador, id
LIMIT 10;


// ---------- 10. Camino de un usuario a una oferta laboral ----------
// @rutaAOferta
// Como la consulta 3, pero termina en la oferta: muestra por quién puede llegar
// el usuario a esa vacante. PUBLICA conecta la empresa con su oferta.
:param usuarioId => 'usr-38'
:param ofertaId => 'of-06'

MATCH (u:Usuario {id: $usuarioId})
MATCH (o:Oferta {id: $ofertaId})
MATCH ruta = allShortestPaths((u)-[:CONECTA_CON|TRABAJA_EN|PUBLICA*..8]-(o))
WITH ruta ORDER BY [n IN nodes(ruta) | n.id]
LIMIT 1
RETURN length(ruta) AS saltos,
       [n IN nodes(ruta) | coalesce(n.nombre, n.titulo)] AS camino,
       [r IN relationships(ruta) | type(r)] AS relaciones,
       [n IN nodes(ruta) | n { .id, nombre: coalesce(n.nombre, n.titulo), tipo: labels(n)[0] }] AS nodos;


// =====================================================================
// C. ANALÍTICA CON GRAPH DATA SCIENCE
// =====================================================================

// ---------- 11. Proyección del grafo a memoria ----------
// @borrarProyeccion
// Los algoritmos de GDS no corren sobre la base en disco: trabajan sobre una copia
// en memoria (proyección) con solo lo necesario, aquí usuarios y conexiones.
// UNDIRECTED cuenta cada CONECTA_CON en ambos sentidos: por eso relationshipCount
// sale el doble de las relaciones guardadas.
// La proyección no se actualiza sola y se pierde al reiniciar Neo4j: hay que
// volver a crearla tras cambios en la red. Por eso primero se borra la anterior
// (false = no fallar si no existe).
CALL gds.graph.drop('redProfesional', false) YIELD graphName
RETURN graphName AS proyeccionAnterior;

// @crearProyeccion
CALL gds.graph.project('redProfesional', 'Usuario', {CONECTA_CON: {orientation: 'UNDIRECTED'}})
YIELD graphName, nodeCount, relationshipCount
RETURN graphName, nodeCount, relationshipCount;


// ---------- 12. Usuarios más influyentes (PageRank) ----------
// @influyentes
// PageRank, creado para ordenar páginas web: un usuario es influyente si lo
// conectan usuarios a su vez influyentes. No solo cuenta conexiones (grado),
// también pesa quiénes son. dampingFactor 0.85 es el valor estándar.
CALL gds.pageRank.stream('redProfesional', {dampingFactor: 0.85, maxIterations: 20})
YIELD nodeId, score
WITH gds.util.asNode(nodeId) AS u, score
RETURN u.id AS id,
       u.nombre AS usuario,
       u.titular AS titular,
       round(score, 3) AS influencia,
       COUNT { (u)-[:CONECTA_CON]-(:Usuario) } AS conexiones
ORDER BY influencia DESC, usuario, id
LIMIT 10;


// ---------- 13. Comunidades detectadas (Louvain) ----------
// @comunidades
// Louvain agrupa usuarios maximizando la modularidad: muchas conexiones dentro
// del grupo y pocas hacia afuera. Nadie le dice cuántos grupos hay: los descubre.
// El número de comunidad no es estable entre ejecuciones: es una etiqueta, no un dato.
// Se ocultan comunidades de una persona (usuarios sin conexiones).
// El empate se decide por el primer integrante y no por ese número: así el orden no
// cambia entre llamadas, y el panel asigna los colores siguiendo este orden.
// ids va junto a miembros: un nombre no identifica a nadie, puede haber homónimos.
CALL gds.louvain.stream('redProfesional')
YIELD nodeId, communityId
WITH communityId, gds.util.asNode(nodeId) AS u
MATCH (u)-[:VIVE_EN]->(c:Ciudad)
WITH communityId, u, c
ORDER BY u.nombre, u.id
WITH communityId,
     count(u) AS integrantes,
     collect(u.id) AS ids,
     collect(u.nombre) AS miembros,
     collect(DISTINCT c.nombre) AS ciudades
WHERE integrantes > 1
RETURN communityId AS comunidad, integrantes, ciudades, ids, miembros
ORDER BY integrantes DESC, ids[0];
