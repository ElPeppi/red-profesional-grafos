import { Router } from 'express';
import { versionNeo4j } from '../neo4j.js';

// Healthcheck: confirma que la API está viva y alcanza la base de datos.
export const rutasSalud = Router();

rutasSalud.get('/', async (_req, res) => {
  try {
    res.json({ estado: 'ok', neo4j: await versionNeo4j() });
  } catch {
    res.status(503).json({ estado: 'sin base de datos' });
  }
});
