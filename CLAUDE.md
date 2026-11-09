# Contexto del proyecto para Claude

Proyecto I+D de Bases de Datos (Uninorte, 202610-2497): aplicación de red profesional sobre Neo4j.
El enunciado completo está en `docs/enunciado.md`. El README tiene el modelo y cómo levantar la base.

## Cómo trabajar con ElPeppi
- Avanzar por partes: mostrar sugerencias y preguntar antes de construir cada parte.
- No dar solo pasos: explicar qué se hace, para qué sirve, cómo se llama en la industria y qué está aprendiendo.
- Tono casual y directo, en español.

## Decisiones ya tomadas
- Stack: Neo4j 5.26 Community + plugin Graph Data Science en Docker local; backend Node.js + TypeScript con
  `neo4j-driver` oficial; frontend React 19 + Vite + TypeScript, React Router 7 (la 8 exige Node 22.22 y hay
  22.18), TanStack Query y Tailwind 4.
- Frontend: proxy de Vite (`/api` → `localhost:3000`, sin CORS). Validación solo en el backend: `noValidate` y
  errores de `campos` junto a cada input, por eso sus mensajes van en español. Búsqueda y página en la URL.
  "Actuar como" en Context + `localStorage`; solo un 404 lo suelta, una caída no. Probar con Playwright (usa
  el Chrome instalado) y mutaciones. Interceptar con URL completa: `**/api/**` atrapa también `/src/api/`.
- Botones que escriben: `disabled` no frena un doble clic, porque React Query avisa en el siguiente tick. Usar
  `useSinRepetir` con `mutateAsync`.
- Fechas `AAAA-MM-DD` en el navegador: nunca `new Date()`, corre un día en Colombia. Usar `mesYAnio`.
- Grafo: `react-force-graph-2d` carga diferida (`GrafoDiferido`, 205 KB aparte). La librería escribe posiciones
  en los objetos y falla si una arista apunta a un nodo ausente: pasar copias y filtrar. `/analitica/grafo` trae
  estructura y `/analitica/comunidades` los grupos; se cruzan por id, nunca por nombre.
- Color de comunidad: sigue el orden de `/comunidades` (tamaño y luego primer integrante, no `communityId`).
  Paleta en `colores.ts`, validada comparando todos los pares: 5 colores con número en cada nodo; la sexta va
  en gris, nunca se cicla. Separar comunidades en el dibujo con fuerza de enlaces (`grupoDe`), no cambia datos.
- Probar un canvas: `e2e/ayudas.ts` cuenta píxeles por color y hace clic donde hay un nodo de ese color.
- Toda escritura con `useEscritura`, también crear, editar y borrar personas: invalida todo menos
  `['catalogo', …]` al terminar, también si falla (un 409 suele decir que la pantalla estaba vieja). El CRUD de
  personas antes invalidaba solo personas y analítica, y borrar a alguien dejaba sus postulaciones en la
  pantalla de la oferta hasta 10 s (lo halló el ensayo de la demo). Botones con `useAccion`: candado y error propios.
- Caminos: elegir el destino antes de que la página se pinte con el origen nuevo lo pierde (el `onChange` usa los
  parámetros del render anterior). A ritmo humano no pasa; las pruebas esperan la URL con `origen=` antes.
- Mismos datos, misma respuesta: recargar la semilla cambia el orden interno de los nodos, y `collect()` sin orden
  devolvía listas en otro orden ("Python, AWS y SQL"). Toda lista se ordena antes de juntarla (`WITH … ORDER BY`
  antes de `collect()`, `ORDER BY` dentro de cada `COLLECT { }`, por nombre y luego id) y todo `ORDER BY` final
  desempata hasta el id. Caminos: `allShortestPaths` + `ORDER BY [n IN nodes(ruta) | n.id] LIMIT 1` (con
  `shortestPath`, entre caminos igual de cortos salía cualquiera). `@grafoDeLaRed` ordena nodos y aristas: el
  dibujo parte del orden de los nodos. `backend/tests/orden.test.ts` lo exige para toda la semilla (9 de 9
  mutaciones detectadas). Al cambiar `db/03`, regenerar los bloques de la sección 5 y el anexo D del documento.
- Dibujo del grafo: quien no tiene aristas lleva gravedad 0,12 (`GRAVEDAD_AISLADO`); con la común (0,04) quedaba
  tan lejos que el zoom encogía el resto a puntos de 2 o 3 píxeles y fallaban las pruebas del canvas.
- Relación entre dos personas: `GET /usuarios/:id/relacion/:otroId` reusa `@estadoDeConexion`. Sin login,
  cualquiera edita vínculos de cualquiera desde el perfil, igual que el CRUD.
- Borrados con `useEscritura(..., { esperar: false })`: quien borra navega antes de que se vuelva a pedir el
  registro. Formularios de empresa, oferta y proyecto con `FormularioSimple`; detalles con `Detalle`.
- `npm run dev` del backend vigila también `db/*.cypher` (`tsx watch --include`): antes, cambiar una consulta
  no se veía hasta reiniciar a mano.
- E2E marcan empresas, ofertas y proyectos con `[prueba] ` (como el backend); `e2e/limpieza.ts` los borra,
  ofertas primero.
- Benchmark: mismos CSV para las dos bases (`benchmark/datos/<escala>/`, fuera de git). Postgres guarda cada
  conexión en los dos sentidos e indexa cada relación por ambos extremos: su mejor diseño, para que la
  comparación sea justa. FKs e índices se crean después del COPY. Neo4j monta los CSV en `/import:ro`; en
  `/var/lib/neo4j/import` les cambia dueño y permisos y Postgres ya no los lee. Vaciar Neo4j grande: relaciones
  primero y en lotes, o se agota la memoria de transacciones.
- Medición justa: tiempo en el cliente, así que hablar con Neo4j cuesta ~1 ms fijo contra ~0,24 ms en Postgres
  (`npm run ida-y-vuelta`; `session.run` ya es la vía más rápida del driver). Ordenar por id en Cypher exige
  `WHERE u.id IS NOT NULL` para usar el índice. `camino` en Postgres: CTE pura y también procedimiento
  (`sql/funciones.sql`); Neo4j busca desde ambos extremos (bidireccional), el procedimiento no.
- Driver con `maxTransactionRetryTime` de 5 s: con 30 s por defecto, Neo4j caído colgaba cada petición 45 s o
  más. Ahora responde 503 en unos 7 s, y el frontend no repite los 503.
- Modelo: nodos Usuario, Empresa, Habilidad, Proyecto, Oferta, Ciudad. Relaciones del enunciado + extras
  elegidos: `Proyecto-[:USA]->Habilidad`, `Empresa-[:DESARROLLA]->Proyecto`, Ciudad como nodo
  (`VIVE_EN`, `UBICADA_EN`) y solicitudes de conexión.
- Solicitudes: relación aparte `SOLICITA_CONEXION {fecha}`; al aceptar se borra y se crea `CONECTA_CON`
  (no se usa una propiedad `estado` en `CONECTA_CON`).
- `CONECTA_CON` se guarda una vez y se consulta sin dirección.
- Convenciones: etiquetas PascalCase, relaciones MAYUSCULAS_CON_GUION_BAJO, propiedades camelCase,
  identificadores en español. Ids semilla legibles (`usr-01`); los que cree la app con `randomUUID()`.
- Datos: semilla curada de 40 usuarios en 4 comunidades + generador masivo con semilla (`benchmark/`) para el
  benchmark grafo vs relacional de la investigación.
- Backend: Express 5 + Zod, sin login (el frontend tendrá selector "actuar como usuario"). Capas `rutas/`
  (HTTP y validación) y `repositorios/` (Cypher). Pruebas con Vitest + Supertest contra el Neo4j local.
- Cypher: todo en `db/`, cargado por marca `// @nombre` (`03_consultas` lectura, `04_operaciones` escrituras).
- Enteros hacia Neo4j siempre con `entero()`: un number de JS llega como Float.
- Fechas con `date({timezone: 'America/Bogota'})`, nunca `date()`: el contenedor corre en UTC.
- Integridad referencial a mano: un grafo no tiene llaves foráneas. Empresa con ofertas no se borra (409);
  borrar oferta o usuario se lleva sus postulaciones; cerrar oferta las conserva.
- Datos de prueba marcados: usuarios con `@prueba.test`; empresas, ofertas y proyectos con `conMarca()`.
- Duplicados bajo concurrencia: `MERGE`, no revisar y luego `CREATE`. Pruebas de concurrencia: abrir
  conexiones antes (`abrirConexiones`) e ir directo a la consulta, o pasan por suerte de tiempos.
- GDS: recrear la proyección en cada llamada de analítica, de una en una (`enCola`, solo cubre un proceso).
- Deduplicar por nodo (`WITH DISTINCT c`), no por nombre: `RETURN DISTINCT c.nombre` junta homónimos.
- Git Bash convierte `/scripts/...` en `C:/Program Files/Git/scripts/...`: anteponer `MSYS_NO_PATHCONV=1` a
  `docker compose exec ... -f /scripts/...` (PowerShell no lo necesita).
- Playwright en la SPA: `waitForLoadState('networkidle')` no espera peticiones de una navegación interna;
  esperar el texto que debe aparecer. Por eso una lista en caché parecía vieja y no era un bug.
- Docker Desktop que se cierra con error de `dockerInference` ("El sistema no tiene acceso al archivo"):
  socket viejo de un apagado brusco; con Docker cerrado, renombrar la carpeta `%LOCALAPPDATA%\Docker\run`.
- Recomendación de candidatos: devuelve también el porqué (habilidades que cumple, las que faltan, contactos
  en la empresa, misma ciudad). Puntaje: 60% habilidades + 30% contactos (tope 3) + 10% ciudad. Orden: menos
  obligatorias faltantes primero, luego puntaje (`ORDER BY size(faltanObligatorias), puntaje DESC`; la consulta
  de empleos usa las mismas reglas).

## Estado
1. Modelo del grafo: hecho.
2. Docker + `db/01_esquema.cypher` + `db/02_datos_semilla.cypher`: hecho y probado contra Neo4j 5.26.32 +
   GDS 2.13.14 el 2026-11-06. Conteo: Ciudad 6, Empresa 8, Habilidad 29, Oferta 15, Proyecto 12, Usuario 40
   (110 nodos, 554 relaciones); la semilla es idempotente y `00_limpiar.cypher` funciona. Semilla ajustada
   para que las 14 ofertas abiertas tengan al menos 1 candidato disponible que cumpla todas las obligatorias.
3. Consultas Cypher (`db/03_consultas.cypher`): hechas y probadas. 13 consultas de solo lectura, cada una con
   valor de ejemplo en `:param`. Louvain detecta 5 comunidades (Medellín se parte en cloud y diseño), no 4.
4. Backend Node/TS (`backend/`): hecho y probado (337 pruebas, 10 de ellas de orden), por tramos.
   - Tramo 1 hecho: config, driver, cargador, errores, `/salud`, CRUD de usuarios y buscador.
   - Tramo 2 hecho: solicitudes (crear, aceptar, rechazar, bandeja) y lista de conexiones.
   - Tramo 3 hecho: vínculos, empresas, ofertas, proyectos, postulaciones y catálogos.
   - Tramo 4 hecho: consultas de `03`, recomendaciones y analítica. 404 solo si el nodo no existe; sin
     resultados es 200 con lista vacía y sin camino es `ruta: null`.
5. Frontend React (`frontend/`): hecho y probado, por tramos.
   - Tramo 1 hecho y probado (36 pruebas E2E): Vite, proxy, cliente API, menú, selector "actuar como", buscador,
     CRUD y perfil de personas.
   - Tramo 2 hecho y probado (23 pruebas E2E más): vistas Panel y Caminos con grafo en canvas, y clic en nodos.
   - Tramo 3 hecho y probado (22 pruebas E2E más): Mi red (solicitudes, conexiones, sugerencias de contactos y
     empleos con porqué, postularse) y perfil con relación, contactos en común, similares y vínculos editables.
   - Tramo 4 hecho y probado (22 pruebas E2E más, 103 en total): empresas, ofertas (requisitos, cerrar,
     postulantes con estado, candidatos), proyectos (tecnologías, miembros, colaboradores, relacionados) y
     enlaces entre vistas. Frontend completo.
6. Benchmark grafo vs relacional (`benchmark/`): hecho. Informe y conclusiones en `benchmark/RESULTADOS.md`
   (fuente para la parte de investigación del documento).
   - Tramo 1 hecho y probado (10 pruebas del generador): contenedores con `--profile benchmark` (Neo4j 7475/7688
     y PostgreSQL 17 en 5433, ambos 4 CPU, 5 GB y 2 GB de caché), generador con semilla, esquema SQL equivalente
     y carga verificada contra `resumen.json`. 1 000, 10 000 y 100 000 personas cargan y coinciden. 100 000 =
     490 653 conexiones, grado máximo 581; carga Neo4j ~17 s (LOAD CSV) vs Postgres ~6 s (COPY), no comparable
     como prueba de escritura.
   - Tramo 2 hecho y probado (21 pruebas en total): 14 consultas pareadas en `src/consultas.ts`, `npm run medir`
     verifica (Neo4j = Postgres = verdad en memoria) con las 5 de calentamiento y mide 30, guarda planes.
   - Tramo 3 hecho: las tres escalas medidas de nuevo con el código final; `npm run graficas` genera 4 gráficas
     (SVG y PNG al doble, para Word o Google Docs) y `resultados/tablas.md`. A 100 000 (medianas, ms, Neo4j vs
     Postgres): ida y vuelta 0,92 vs 0,31; alcance-4 18,9 vs 84,8; camino 1,16 vs 1 131 (CTE) y 282
     (procedimiento); habilidades 6,9 vs 3,0; candidatos 403 vs 489; insertar 65 vs 67. Dos corridas a 100 000
     variaron hasta 38 % (61 % la CTE del camino) sin cambiar ningún ganador.
7. Documento de entrega (Claude Doc https://claude.ai/artifact/SgtUSnYgt5WKbAfuWW6uxM): hecho, en 3 tramos.
   - Secciones 1 a 10 y anexos A a D (`db/00` a `03` completos): introducción, marco teórico, modelo, scripts,
     13 consultas con resultados reales, aplicación (capturas en `docs/capturas/`), calidad, investigación con
     3 gráficas dibujadas desde las filas, conclusiones y referencias APA 7.
   - Cada cifra se verificó contra datos ejecutados. Los anexos se generan desde `db/` (no copiar a mano) y se
     suben como blob markdown. El enlace de GraphAcademy (native graph) murió: se cita el blog de Neo4j
     (Stegeman, 2023). Si cambia un script de `db/`, regenerar el anexo.
   - Falta del usuario: integrantes y profesor de la portada (`[por completar]`).
8. Guion de demo (máx. 15 min): hecho, en 2 tramos.
   - Tramo 1 hecho: `docs/guion-demo.md`, 8 bloques con reloj, qué decir, qué debe verse (verificado en la app
     real con la semilla limpia), plan B, preguntas probables y fallas conocidas. Persona nueva de la demo:
     Lucía Fernández (no está en la semilla; Laura Martínez sí y su email choca), empleo en Puerto Logística
     Digital (si trabaja en Caribe Software, la recomendación la excluye de su propia oferta).
   - Tramo 2 hecho: `scripts/preparar-demo.ps1` (Windows PowerShell 5.1, con BOM; `-Ensayo` y `-Benchmark`),
     `frontend/ensayo/demo.spec.ts` con su propia config (`npm run ensayo`: exige semilla limpia, lo dice si no,
     y borra lo que crea) y `npm run demo` en `benchmark/` (camino en vivo, mismas parejas que `medir`,
     respuesta verificada). Neo4j en vivo da ~2 ms y no 1,2: se toma la mediana de 5 seguidas, y recién
     encendido el contenedor da 45–65 ms, por eso el script lo corre antes. Probado de punta a punta.
   - El ensayo halló el bug de caché del CRUD de personas (arreglado, con prueba e2e nueva: 104) y la falta de
     orden determinista (arreglado, ver Decisiones; 104 e2e y ensayo verdes tras recargar la semilla dos veces).

## Comandos útiles
```bash
docker compose up -d
docker compose exec neo4j cypher-shell -u neo4j -p redprofesional123 -f /scripts/01_esquema.cypher
docker compose exec neo4j cypher-shell -u neo4j -p redprofesional123 -f /scripts/02_datos_semilla.cypher
docker compose exec neo4j cypher-shell -u neo4j -p redprofesional123 -f /scripts/03_consultas.cypher
docker compose exec neo4j cypher-shell -u neo4j -p redprofesional123 -f /scripts/00_limpiar.cypher
cd backend && npm run dev
cd backend && npm test        # requiere Neo4j con la semilla cargada
cd backend && npm run typecheck   # Vitest no revisa tipos: correrlo también
cd frontend && npm run dev        # http://localhost:5173, con el backend encendido
cd frontend && npm run e2e        # enciende lo que falte; requiere Neo4j con la semilla
cd frontend && npm run typecheck
docker compose --profile benchmark up -d
cd benchmark && npm run generar -- 10000 && npm run cargar -- 10000
cd benchmark && npm test && npm run typecheck
powershell -ExecutionPolicy Bypass -File scripts\preparar-demo.ps1 -Ensayo -Benchmark   # víspera de la demo
cd frontend && npm run ensayo     # el guion de la demo en el navegador; exige semilla recién cargada
cd benchmark && npm run demo      # camino más corto en vivo con 100 000 personas
```
