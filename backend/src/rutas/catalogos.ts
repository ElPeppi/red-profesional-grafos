import { Router } from 'express';
import { listarCiudades, listarHabilidades } from '../repositorios/catalogos.js';

export const rutasCatalogos = Router();

rutasCatalogos.get('/ciudades', async (_req, res) => {
  res.json(await listarCiudades());
});

rutasCatalogos.get('/habilidades', async (_req, res) => {
  res.json(await listarHabilidades());
});
