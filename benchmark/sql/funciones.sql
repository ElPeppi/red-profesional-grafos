-- Camino más corto con BFS procedimental: lo mejor que se puede hacer en PostgreSQL cuando la CTE
-- recursiva no alcanza. Lleva las personas ya visitadas en una tabla temporal (la CTE no puede) y
-- se detiene apenas aparece el destino. Devuelve los saltos, o NULL si está a más de `maximo`.
CREATE OR REPLACE FUNCTION camino_bfs(origen text, destino text, maximo int) RETURNS int
LANGUAGE plpgsql AS $$
DECLARE
  nivel int := 0;
  nuevos int;
BEGIN
  IF origen = destino THEN
    RETURN 0;
  END IF;

  CREATE TEMP TABLE IF NOT EXISTS bfs_visto (id text PRIMARY KEY);
  CREATE TEMP TABLE IF NOT EXISTS bfs_frontera (id text PRIMARY KEY);
  CREATE TEMP TABLE IF NOT EXISTS bfs_siguiente (id text PRIMARY KEY);
  TRUNCATE bfs_visto, bfs_frontera, bfs_siguiente;
  INSERT INTO bfs_visto VALUES (origen);
  INSERT INTO bfs_frontera VALUES (origen);

  WHILE nivel < maximo LOOP
    nivel := nivel + 1;
    TRUNCATE bfs_siguiente;
    INSERT INTO bfs_siguiente
      SELECT DISTINCT c.contacto_id
      FROM bfs_frontera f
      JOIN conexiones c ON c.usuario_id = f.id
      WHERE NOT EXISTS (SELECT 1 FROM bfs_visto v WHERE v.id = c.contacto_id);
    GET DIAGNOSTICS nuevos = ROW_COUNT;

    IF EXISTS (SELECT 1 FROM bfs_siguiente WHERE id = destino) THEN
      RETURN nivel;
    END IF;
    IF nuevos = 0 THEN
      RETURN NULL;
    END IF;

    INSERT INTO bfs_visto SELECT id FROM bfs_siguiente;
    TRUNCATE bfs_frontera;
    INSERT INTO bfs_frontera SELECT id FROM bfs_siguiente;
  END LOOP;

  RETURN NULL;
END
$$;
