# Tablas del benchmark

Generadas por `npm run graficas`.

## 1.000 personas

Mediana y p95 de 30 mediciones, en ms.

| Consulta | Neo4j, ms | PostgreSQL, ms | Más rápido |
|---|---|---|---|
| Ida y vuelta (sin trabajo) | 0,9 (p95 1,34) | 0,24 (p95 0,36) | PostgreSQL 3,8× |
| Buscar por id | 1,01 (p95 1,29) | 0,3 (p95 0,55) | PostgreSQL 3,4× |
| Página de 20, en posición al azar | 1,19 (p95 1,7) | 0,34 (p95 0,46) | PostgreSQL 3,5× |
| Habilidades más demandadas | 1,39 (p95 1,99) | 0,4 (p95 0,59) | PostgreSQL 3,5× |
| Contactos en común | 1,09 (p95 1,59) | 0,37 (p95 0,6) | PostgreSQL 2,9× |
| Amigos de amigos | 2,33 (p95 3,37) | 0,87 (p95 1,67) | PostgreSQL 2,7× |
| Alcance a 1 salto | 1,37 (p95 2,51) | 0,42 (p95 0,56) | PostgreSQL 3,3× |
| Alcance a 2 saltos | 1,51 (p95 2,36) | 0,53 (p95 0,85) | PostgreSQL 2,8× |
| Alcance a 3 saltos | 1,57 (p95 2,34) | 1,44 (p95 2,88) | PostgreSQL 1,1× |
| Alcance a 4 saltos | 1,77 (p95 2,48) | 4,92 (p95 7,76) | Neo4j 2,8× |
| Camino más corto | 1,21 (p95 2,57) | 11,76 (p95 14,28) | Neo4j 9,7× |
| Camino más corto (procedimiento) | no aplica | 15,8 (p95 21,5) | — |
| Candidatos para una oferta | 4,52 (p95 6,44) | 4,27 (p95 6,12) | PostgreSQL 1,1× |
| Insertar 1.000 conexiones | 58,67 (p95 65,76) | 19,46 (p95 21,58) | PostgreSQL 3× |

## 10.000 personas

Mediana y p95 de 30 mediciones, en ms.

| Consulta | Neo4j, ms | PostgreSQL, ms | Más rápido |
|---|---|---|---|
| Ida y vuelta (sin trabajo) | 0,94 (p95 1,47) | 0,27 (p95 0,39) | PostgreSQL 3,5× |
| Buscar por id | 0,98 (p95 1,28) | 0,28 (p95 0,49) | PostgreSQL 3,5× |
| Página de 20, en posición al azar | 1,51 (p95 2,13) | 0,81 (p95 1,09) | PostgreSQL 1,9× |
| Habilidades más demandadas | 1,87 (p95 2,41) | 0,69 (p95 0,96) | PostgreSQL 2,7× |
| Contactos en común | 1,06 (p95 1,51) | 0,32 (p95 1,05) | PostgreSQL 3,3× |
| Amigos de amigos | 1,55 (p95 1,99) | 0,86 (p95 1,2) | PostgreSQL 1,8× |
| Alcance a 1 salto | 1,27 (p95 2,32) | 0,26 (p95 0,5) | PostgreSQL 4,9× |
| Alcance a 2 saltos | 1,26 (p95 1,66) | 0,52 (p95 0,91) | PostgreSQL 2,4× |
| Alcance a 3 saltos | 1,97 (p95 3,08) | 2,8 (p95 7,1) | Neo4j 1,4× |
| Alcance a 4 saltos | 4,79 (p95 8,37) | 19,37 (p95 33,02) | Neo4j 4× |
| Camino más corto | 0,98 (p95 1,61) | 92,31 (p95 135,28) | Neo4j 94,2× |
| Camino más corto (procedimiento) | no aplica | 32,77 (p95 62,3) | — |
| Candidatos para una oferta | 28,91 (p95 46,85) | 25,85 (p95 37,53) | PostgreSQL 1,1× |
| Insertar 1.000 conexiones | 61,35 (p95 64,42) | 22,87 (p95 25,82) | PostgreSQL 2,7× |

## 100.000 personas

Mediana y p95 de 30 mediciones, en ms.

| Consulta | Neo4j, ms | PostgreSQL, ms | Más rápido |
|---|---|---|---|
| Ida y vuelta (sin trabajo) | 0,92 (p95 1,65) | 0,31 (p95 0,49) | PostgreSQL 3× |
| Buscar por id | 0,91 (p95 1,51) | 0,31 (p95 0,49) | PostgreSQL 2,9× |
| Página de 20, en posición al azar | 4,7 (p95 6,57) | 4,84 (p95 8,95) | Neo4j 1× |
| Habilidades más demandadas | 6,87 (p95 8,36) | 3 (p95 3,93) | PostgreSQL 2,3× |
| Contactos en común | 0,89 (p95 1,28) | 0,34 (p95 0,51) | PostgreSQL 2,6× |
| Amigos de amigos | 1,24 (p95 2,11) | 0,56 (p95 1) | PostgreSQL 2,2× |
| Alcance a 1 salto | 0,97 (p95 1,34) | 0,32 (p95 0,53) | PostgreSQL 3× |
| Alcance a 2 saltos | 1,23 (p95 1,53) | 0,54 (p95 1,31) | PostgreSQL 2,3× |
| Alcance a 3 saltos | 2,83 (p95 10,97) | 5,6 (p95 24,19) | Neo4j 2× |
| Alcance a 4 saltos | 18,92 (p95 41,41) | 84,75 (p95 229,24) | Neo4j 4,5× |
| Camino más corto | 1,16 (p95 1,86) | 1.131,37 (p95 1.446,18) | Neo4j 975,3× |
| Camino más corto (procedimiento) | no aplica | 282,27 (p95 562,58) | — |
| Candidatos para una oferta | 403,17 (p95 659,8) | 489,23 (p95 734,05) | Neo4j 1,2× |
| Insertar 1.000 conexiones | 65,03 (p95 75,58) | 67,47 (p95 73,82) | Neo4j 1× |
