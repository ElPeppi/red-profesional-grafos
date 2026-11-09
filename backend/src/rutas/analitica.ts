import { Router } from 'express';
import {
  comunidadesDetectadas,
  grafoDeLaRed,
  habilidadesDemandadas,
  usuariosInfluyentes,
} from '../repositorios/analitica.js';

export const rutasAnalitica = Router();

rutasAnalitica.get('/influyentes', async (_req, res) => {
  res.json(await usuariosInfluyentes());
});

rutasAnalitica.get('/comunidades', async (_req, res) => {
  res.json(await comunidadesDetectadas());
});

rutasAnalitica.get('/habilidades', async (_req, res) => {
  res.json(await habilidadesDemandadas());
});

rutasAnalitica.get('/grafo', async (_req, res) => {
  res.json(await grafoDeLaRed());
});
