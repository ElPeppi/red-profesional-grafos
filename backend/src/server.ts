import { app } from './app.js';
import { config } from './config.js';
import { cerrarDriver } from './neo4j.js';

const servidor = app.listen(config.PUERTO, () => {
  console.log(`API en http://localhost:${config.PUERTO}`);
});

servidor.on('error', (error) => {
  console.error('No se pudo iniciar el servidor:', error.message);
  process.exit(1);
});

// Apagado ordenado: termina las peticiones en curso y cierra las conexiones a Neo4j.
function apagar() {
  servidor.close(() => {
    void cerrarDriver().finally(() => process.exit(0));
  });
}

process.on('SIGINT', apagar);
process.on('SIGTERM', apagar);
