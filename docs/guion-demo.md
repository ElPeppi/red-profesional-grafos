# Guion de la demo (15 minutos)

Demo de la red profesional sobre Neo4j. El contenido dura unos 13 minutos y deja 2 de margen para preguntas o
imprevistos. Los bloques van de la A a la H para repartirlos entre los integrantes.

Cada paso dice qué hacer, qué decir y qué debe aparecer en pantalla. Los datos que aparecen fueron
comprobados en la app real con la semilla recién cargada: si algo se ve distinto, la base no estaba limpia
(ver [Antes de empezar](#antes-de-empezar)).

| Reloj | Bloque | Quién | Requisitos del enunciado que cubre |
|---|---|---|---|
| 0:00 | A. Problema y modelo | | Modelo del grafo |
| 1:00 | B. La base por dentro (Neo4j Browser) | | Contactos en común |
| 2:30 | C. Una persona nueva, de punta a punta | | CRUD, conexiones, vínculos, empresas y ofertas, requisitos, postulación, recomendaciones de contactos y empleos, candidatos |
| 7:00 | D. Perfil, caminos y proyectos | | Habilidades similares, contactos en común, ruta más corta, colaboradores, proyectos relacionados |
| 8:45 | E. Panel de analítica | | Influyentes, comunidades, habilidades más demandadas |
| 10:00 | F. Investigación: grafo vs relacional | | Componente de investigación |
| 12:30 | G. Cierre | | Respuesta a la pregunta de investigación |
| 13:30 | H. Preguntas | | |

## Antes de empezar

**La víspera**, con Docker Desktop abierto, desde la raíz del repositorio en PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\preparar-demo.ps1 -Ensayo -Benchmark
```

Recarga la semilla, recorre este guion completo en el navegador comprobando cada dato (`npm run ensayo` en
`frontend/`), vuelve a cargar la semilla y prueba el camino en vivo del bloque F. Si algo cambió en la app o
en los datos, falla aquí y no frente al profesor. Después, ensayar en voz alta una vez con cronómetro.

**30 minutos antes:**

1. Abrir Docker Desktop y esperar a que diga *Engine running*.
2. Dejar la base limpia y calentar el benchmark (sin `-Benchmark` si no se hará el camino en vivo):

   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\preparar-demo.ps1 -Benchmark
   ```

   Debe terminar en "Listo para la demo". Si el script no está a mano, lo mismo a mano:
   `docker compose up -d` y luego `00_limpiar`, `01_esquema` y `02_datos_semilla` con `cypher-shell` (ver
   README). En Git Bash, anteponer `MSYS_NO_PATHCONV=1`.
3. Encender la aplicación, cada una en su terminal: `cd backend && npm run dev` y `cd frontend && npm run dev`.

**Pestañas abiertas, en este orden:**

1. La app en `http://localhost:5173/personas`, sin nadie en "Actuar como" (botón *Salir* si hay alguien).
2. Neo4j Browser en `http://localhost:7474` (usuario `neo4j`, contraseña `redprofesional123`), con las tres
   consultas del bloque B guardadas como favoritas.
3. El documento de entrega abierto en la sección 3 (diagrama del modelo); el bloque F usa la sección 8.
4. Opcional: una terminal en `benchmark/` para el camino en vivo.

Zoom del navegador al 125 % para el proyector.

## A. Problema y modelo (0:00 – 1:00)

**Pantalla:** documento, diagrama de la sección 3.

> "Una red profesional es, ante todo, conexiones: quién conoce a quién, quién trabaja dónde, qué sabe hacer
> cada uno. En una base relacional eso son tablas intermedias y joins; en un grafo, las conexiones son datos de
> primera clase. Modelamos 6 tipos de nodo y 12 tipos de relación. Usuario está en el centro: 7 de las 12
> relaciones salen de él."

Señalar dos decisiones del modelo:

- La ciudad es un nodo, no un texto, para poder recorrer por ciudad.
- La solicitud de conexión (`SOLICITA_CONEXION`) es una relación distinta de la conexión aceptada
  (`CONECTA_CON`): al aceptar, una se borra y se crea la otra.

## B. La base por dentro (1:00 – 2:30)

**Pantalla:** Neo4j Browser.

1. Correr:

   ```cypher
   CALL db.schema.visualization()
   ```

   Debe dibujar 6 etiquetas. `UBICADA_EN` aparece dos veces (empresa y oferta van a una ciudad).

   > "Esto lo dibuja Neo4j a partir de los datos: es el mismo modelo del diagrama."

2. Contactos en común entre Paula Moreno y Nicolás Cárdenas, devolviendo el camino para que Browser lo dibuje:

   ```cypher
   MATCH p = (:Usuario {id: 'usr-15'})-[:CONECTA_CON]-(:Usuario)-[:CONECTA_CON]-(:Usuario {id: 'usr-20'})
   RETURN p
   ```

   Deben aparecer 4 personas en medio: Alejandro Suárez, Diego Ramírez, Isabella Rojas y Sebastián Torres.

   > "La consulta es literalmente el dibujo: persona, conexión, alguien, conexión, persona. No hay flecha porque
   > la conexión se guarda una sola vez y se lee en los dos sentidos."

3. (Si sobra tiempo) El camino de Kevin Petro a Estudio Pixel, dibujado:

   ```cypher
   MATCH ruta = shortestPath((:Usuario {id: 'usr-38'})-[:CONECTA_CON|TRABAJA_EN*..8]-(:Empresa {id: 'emp-06'}))
   RETURN ruta
   ```

**Plan B:** si Browser no carga, mostrar las mismas consultas en la sección 5 del documento (5.2 y 5.3).

## C. Una persona nueva, de punta a punta (2:30 – 7:00)

**Pantalla:** la app. Es el bloque más largo: cubre siete de los nueve requisitos de la aplicación.

> "Vamos a registrar a una persona y seguirla hasta que se postula a un empleo."

**C1. Crear y vincular (CRUD y vínculos).**

1. *Personas* → *Nueva persona*. Llenar: **Lucía Fernández**, `lucia.fernandez@example.com`, titular
   **Data Engineer**, ciudad **Barranquilla**, **2** años, marcar *Abierto a ofertas*. *Crear persona*.
2. En su perfil, *Habilidades* → *Editar*: **Python 4**, **SQL 4**, **Neo4j 3** (*Agregar* cada una). *Listo*.
   Esperar a que cada habilidad aparezca en la lista antes de elegir la siguiente: el formulario se vacía al
   terminar de guardar y borraría una elección hecha antes.
3. *Empleos* → *Editar*: empresa **Puerto Logística Digital**, cargo **Data Engineer**, desde
   **01/03/2025**, marcar *Trabaja ahí actualmente*. *Agregar empleo*. *Listo*.
4. *Editar* (arriba): cambiar el titular a **Data Engineer en Puerto Logística Digital**. *Guardar cambios*.

Debe aparecer en *Habilidades parecidas*: Ana María Lozano, Diego Ramírez y Mateo Sánchez con 60 %.

> "Sin tener ni un contacto, el grafo ya encuentra a quién se parece: Jaccard, habilidades en común sobre
> todas las de los dos."

**C2. Recomendación de contactos y conexión.**

1. *Actuar como esta persona* → *Mi red*.
2. En *Personas que podrías conocer* debe estar **Carlos Mejía**, con "Coincidieron en Puerto Logística
   Digital" y "Viven en la misma ciudad".

   > "Cada sugerencia dice por qué: empresas, habilidades, ciudad, contactos de contactos. Es una sola consulta
   > Cypher que recorre todos esos caminos."

3. *Conectar* con Carlos Mejía. Pasa a *Solicitudes enviadas*.
4. Arriba, *Cambiar* → escribir "mejia" → **Carlos Mejía**. En *Solicitudes recibidas* está Lucía (y también
   Valeria Ortiz, de la semilla: no tocarla). *Aceptar* a Lucía.

   > "Aceptar borra la solicitud y crea la conexión, en una sola sentencia."

**C3. Empresa, oferta y requisitos.** Seguir actuando como Carlos.

1. *Empresas* → **Caribe Software** → *Publicar oferta*: título **Ingeniero de Datos**, ciudad
   **Barranquilla**, nivel **junior**, modalidad **híbrido**. *Publicar oferta*.
2. *Requisitos* → *Editar*: **Python**, nivel 3, obligatoria; **SQL**, nivel 3, obligatoria; **Neo4j**,
   nivel 2, sin marcar *Es obligatoria* (deseable). *Agregar requisito* cada una, esperando a que aparezca en
   la lista antes de la siguiente. *Listo*.
3. *Candidatos sugeridos*: **Lucía Fernández, ajuste 80 %**, primera: cumple las tres, "Conoce ahí a Carlos
   Mejía", "Vive en la ciudad de la oferta". Segundo, Diego Ramírez con 70 %.

   > "Lucía existe desde hace tres minutos y ya es la mejor candidata: tiene las habilidades, vive en la
   > ciudad y la conexión que acabamos de crear le da un contacto dentro de la empresa. 60 % habilidades, 30 %
   > contactos, 10 % ciudad."

**C4. Recomendación de empleos y postulación.**

1. *Cambiar* → "lucia" → **Lucía Fernández** → *Mi red*. En *Empleos para ti* la primera es **Ingeniero de
   Datos, Caribe Software, ajuste 80 %**. Si un instante se ve la lista anterior, esperar: se actualiza sola.
2. *Postularme* en esa oferta. Aparece en *Mis postulaciones*.
3. En *Mis postulaciones*, clic en **Ingeniero de Datos**. En *Postulantes (1)* cambiar el estado de Lucía a
   **entrevista**.

**C5. Borrar (CRUD) e integridad.**

1. En *Postulantes (1)*, clic en **Lucía Fernández** → *Eliminar* → confirmar.
2. *Ofertas* → **Ingeniero de Datos** (la primera, es la más reciente): *Postulantes (0)*.

   > "Un grafo no tiene llaves foráneas. Esta regla la pone el backend: borrar una persona se lleva sus
   > postulaciones, y una empresa con ofertas no se puede borrar."

**Plan B:** si algo falla a mitad, no improvisar arreglos: pasar al bloque D y, al final, mostrar las
capturas de la sección 6 del documento.

## D. Perfil, caminos y proyectos (7:00 – 8:45)

1. *Cambiar* → "suarez" → **Alejandro Suárez**. Abrir el perfil de **Diego Ramírez** (*Personas*, buscar
   "diego").
   - *Contactos en común* con Alejandro: Mariana López, Nicolás Cárdenas y Paula Moreno.
   - *Habilidades parecidas*: Eduardo Espitia 67 %, Alejandro Suárez 57 %.
2. *Caminos*: en "Desde", *Cambiar* → escribir "kevin" → **Kevin Petro**. Cuando "Desde" ya diga Kevin Petro,
   elegir *Empresa de destino* **Estudio Pixel** (elegirla antes la haría partir de Alejandro). Debe decir
   **A 3 saltos**: Kevin Petro → Marcela Doria → Daniel Quintero → Estudio Pixel, resaltado en el grafo.

   > "Kevin es junior en Montería y quiere entrar a un estudio de diseño en Medellín. El grafo le dice a quién
   > pedirle una presentación. Es `allShortestPaths`: búsqueda por anchura desde los dos extremos, y si hay
   > varios caminos igual de cortos, la consulta elige siempre el mismo."

3. Cambiar a *Oferta* → **Ingeniero de Grafos Neo4j · AndesData**: **4 saltos**, por Marcela Doria y Carolina
   Muñoz, que trabaja en AndesData.
4. *Proyectos* → **Grafo Antifraude**: *Colaboradores sugeridos* Alejandro Suárez 80, Eduardo Espitia 57,
   Natalia Vargas 53. En la lista de proyectos, la pareja más relacionada: Scoring Crediticio con ML y Lago de
   Datos Retail (comparten AWS, SQL y Python).

**Plan B:** sección 5 del documento (5.1, 5.2, 5.3, 5.5, 5.9 y 5.10 traen los mismos resultados).

## E. Panel de analítica (8:45 – 10:00)

**Pantalla:** *Panel*.

1. *Comunidades detectadas*: 5 comunidades de 10, 10, 8, 5 y 5 personas, y 2 personas sin comunidad.

   > "La semilla se diseñó con 4 comunidades regionales. Louvain encontró 5 sin que nadie le dijera cuántas:
   > partió Medellín en dos, cloud y diseño, que casi no se hablan. Cada nodo lleva su número para no depender
   > solo del color."

2. *Usuarios más influyentes*: Carlos Mejía y Paula Moreno (1,72) y Juliana Ospina (1,58) arriba.

   > "Son los puentes entre comunidades. PageRank no cuenta cuántos contactos tienes, sino quién te conecta."

3. *Habilidades más demandadas*: SQL encabeza con **7** ofertas.

   > "Eran 6: la oferta que publicamos hace unos minutos ya cuenta."

**Plan B:** capturas de la sección 6 del documento.

## F. Investigación: grafo vs relacional (10:00 – 12:30)

**Pantalla:** documento, sección 8.

> "El enunciado pide decir cuándo el grafo supera al relacional y cuándo no. No lo respondimos de memoria:
> lo medimos. Los mismos datos en Neo4j y en PostgreSQL, con el mejor diseño posible para PostgreSQL, 14
> consultas y redes de 1 000, 10 000 y 100 000 personas."

1. Gráfica de ventaja con 100 000 personas: el camino más corto es 975 veces más rápido en Neo4j (243 frente
   al mejor procedimiento de PostgreSQL); las consultas cortas, 2 a 3 veces más rápidas en PostgreSQL.

   > "Casi toda la ventaja de PostgreSQL en las consultas cortas es el costo fijo de hablar con la base: 0,9 ms
   > Neo4j contra 0,3 ms PostgreSQL, aun sin hacer nada."

2. Gráfica de profundidad: desde 3 saltos Neo4j pasa adelante.
3. Gráfica de escala: el camino más corto en Neo4j se queda en ~1 ms con 100 veces más personas; en
   PostgreSQL pasa de 12 a 1 131 ms.

   > "Por qué: en Neo4j cada nodo apunta directo a sus vecinos, la adyacencia sin índice. En PostgreSQL cada
   > salto es una búsqueda en un índice, repetida por cada fila."

4. (Opcional, en vivo, unos 10 s) En la terminal de `benchmark/`:

   ```bash
   npm run demo
   ```

   Mide 3 parejas de personas de la red de 100 000, en las dos bases, y comprueba que las tres respuestas
   coincidan con el cálculo en memoria. Con las bases calientes: Neo4j **unos 2 ms** (1,8 a 3 en los ensayos;
   la mediana de 5 repeticiones, porque una sola medición de 1 ms la mueve cualquier pausa del sistema), la CTE
   de PostgreSQL **0,6 a 0,8 s** y el procedimiento **0,25 a 0,3 s**.

   > "En el informe Neo4j da 1,2 ms porque esa medición corre minutos y la JVM ya está muy optimizada. Aquí
   > son unos 2 ms, y la diferencia sigue siendo de cientos de veces."

   Recién encendidos los contenedores, la primera corrida da 45 a 65 ms en Neo4j: por eso `preparar-demo.ps1
   -Benchmark` la corre una vez antes.

**Plan B:** si el benchmark en vivo falla, las gráficas ya dicen lo mismo.

## G. Cierre (12:30 – 13:30)

**Pantalla:** documento, tabla "Dónde gana cada uno" (sección 8.4).

> "El grafo gana cuando la pregunta es sobre la forma de la red: quién está a cuántos saltos, por dónde se
> llega, quién conecta a quién. El relacional gana cuando la pregunta es sobre filas: buscar, sumar, cargar en
> bloque, garantizar integridad. Para una red profesional, cuyo valor está en las conexiones, el grafo es la
> elección natural. Y en sistemas reales muchas veces se usan los dos."

## H. Preguntas (13:30 – 15:00)

Preguntas probables y respuesta corta:

| Pregunta | Respuesta |
|---|---|
| ¿Por qué no PostgreSQL con tablas de conexiones? | Para buscar y sumar sería igual o mejor; para recorrer varios saltos, no. Lo medimos: sección 8. |
| ¿Cómo garantizan la integridad sin llaves foráneas? | Restricciones de unicidad en Neo4j y reglas en el backend: empresa con ofertas no se borra (409), borrar persona se lleva sus postulaciones. |
| ¿Por qué `CONECTA_CON` no tiene dirección? | Una conexión es mutua. Se guarda una vez y se consulta sin flecha; guardarla en los dos sentidos duplicaría datos y abriría la puerta a inconsistencias. |
| ¿Qué pasa si dos personas se envían solicitud a la vez? | `MERGE` evita duplicados, y la solicitud cruzada responde 409. Hay pruebas de concurrencia. |
| ¿Cómo saben que las consultas dan lo correcto? | 337 pruebas del backend contra Neo4j real, 104 de extremo a extremo, pruebas de mutación (245 de 246 errores sembrados detectados) y un ensayo automático de esta misma demo. |
| ¿Siempre sale la misma respuesta? | Sí: cada lista va ordenada y los empates en caminos se resuelven por id. Al principio no, y recargar la semilla cambiaba el orden; una prueba ahora lo exige para toda la semilla. |
| ¿El benchmark es justo? | PostgreSQL tuvo su mejor diseño (conexión en los dos sentidos e índices por ambos extremos), las dos bases responden igual antes de medir y se reportan las amenazas a la validez (sección 8.5). |
| ¿Escala a millones? | No lo medimos; el estándar para eso es el LDBC Social Network Benchmark. Con 100 veces más personas el camino en Neo4j no se movió. |

## Si algo falla

| Síntoma | Qué hacer |
|---|---|
| La app dice que no hay conexión con la base | Neo4j está apagado: `docker compose up -d`. La API responde 503 en unos 7 s en vez de quedarse colgada. |
| "Crear persona" da error de email repetido | Quedó la Lucía de un ensayo: correr `scripts\preparar-demo.ps1` (antes de empezar) o usar otro email. |
| Los números no coinciden con el guion, o el ensayo dice "La base no está como la deja la semilla" | Correr `scripts\preparar-demo.ps1`. |
| `preparar-demo.ps1` no corre por la política de ejecución | Llamarlo como está escrito arriba, con `powershell -ExecutionPolicy Bypass -File`. |
| Docker Desktop muestra un error y se cierra al abrirlo, con `dockerInference` y "El sistema no tiene acceso al archivo" en `%LOCALAPPDATA%\Docker\log\host\com.docker.backend.exe.log` | Un socket viejo de un apagado brusco. Con Docker cerrado, renombrar la carpeta `%LOCALAPPDATA%\Docker\run` (por ejemplo a `run.viejo`) y volver a abrir Docker Desktop. |
| El grafo del panel o de caminos no se dibuja | Recargar la página. Si sigue, mostrar las capturas de la sección 6. |
| Se acaba el tiempo | Saltar D3, D4 y F4. |

## Después de la demo

Correr `scripts\preparar-demo.ps1`: la oferta "Ingeniero de Datos" queda creada y cambia el conteo de
habilidades del panel.
