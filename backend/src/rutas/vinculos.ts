import { Router } from 'express';
import { z } from 'zod';
import { listarPostulaciones } from '../repositorios/postulaciones.js';
import {
  ponerEmpleo,
  ponerHabilidad,
  ponerParticipacion,
  quitarEmpleo,
  quitarHabilidad,
  quitarParticipacion,
} from '../repositorios/vinculos.js';
import { nivelHabilidad } from './validacion.js';

const habilidadEsquema = z.strictObject({ nivel: nivelHabilidad });

const empleoEsquema = z.strictObject({
  cargo: z.string().trim().min(1, 'El cargo es obligatorio').max(120),
  desde: z.iso.date('Usa una fecha real con formato AAAA-MM-DD'),
  actual: z.boolean().default(true),
});

const participacionEsquema = z.strictObject({
  rol: z.string().trim().min(1, 'El rol es obligatorio').max(60),
});

export const rutasVinculos = Router();

// PUT y no POST: el cliente nombra el vínculo completo en la URL y repetir no duplica.
rutasVinculos.put('/:id/habilidades/:habilidadId', async (req, res) => {
  const { nivel } = habilidadEsquema.parse(req.body);
  res.json(await ponerHabilidad(req.params.id, req.params.habilidadId, nivel));
});

rutasVinculos.delete('/:id/habilidades/:habilidadId', async (req, res) => {
  await quitarHabilidad(req.params.id, req.params.habilidadId);
  res.status(204).end();
});

rutasVinculos.put('/:id/empleos/:empresaId', async (req, res) => {
  res.json(await ponerEmpleo(req.params.id, req.params.empresaId, empleoEsquema.parse(req.body)));
});

rutasVinculos.delete('/:id/empleos/:empresaId', async (req, res) => {
  await quitarEmpleo(req.params.id, req.params.empresaId);
  res.status(204).end();
});

rutasVinculos.put('/:id/proyectos/:proyectoId', async (req, res) => {
  const { rol } = participacionEsquema.parse(req.body);
  res.json(await ponerParticipacion(req.params.id, req.params.proyectoId, rol));
});

rutasVinculos.delete('/:id/proyectos/:proyectoId', async (req, res) => {
  await quitarParticipacion(req.params.id, req.params.proyectoId);
  res.status(204).end();
});

rutasVinculos.get('/:id/postulaciones', async (req, res) => {
  res.json(await listarPostulaciones(req.params.id));
});
