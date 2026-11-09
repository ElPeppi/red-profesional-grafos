import { Router } from 'express';
import { z } from 'zod';
import { paginaEsquema } from '../paginacion.js';
import {
  aceptarSolicitud,
  crearSolicitud,
  eliminarSolicitud,
  listarConexiones,
  listarSolicitudes,
  relacionEntre,
} from '../repositorios/red.js';

const nuevaSolicitudEsquema = z.strictObject({
  destinoId: z.string().min(1, 'Falta el usuario destino'),
});

const parEsquema = z.strictObject({
  solicitanteId: z.string().min(1, 'Falta quien envió la solicitud'),
  destinoId: z.string().min(1, 'Falta quien la recibió'),
});

export const rutasRed = Router();

rutasRed.post('/usuarios/:id/solicitudes', async (req, res) => {
  const { destinoId } = nuevaSolicitudEsquema.parse(req.body);
  res.status(201).json(await crearSolicitud({ solicitanteId: req.params.id, destinoId }));
});

rutasRed.get('/usuarios/:id/solicitudes', async (req, res) => {
  res.json(await listarSolicitudes(req.params.id));
});

rutasRed.get('/usuarios/:id/relacion/:otroId', async (req, res) => {
  res.json(await relacionEntre(req.params.id, req.params.otroId));
});

rutasRed.get('/usuarios/:id/conexiones', async (req, res) => {
  res.json(await listarConexiones(req.params.id, paginaEsquema.parse(req.query)));
});

rutasRed.post('/solicitudes/aceptar', async (req, res) => {
  res.json(await aceptarSolicitud(parEsquema.parse(req.body)));
});

rutasRed.post('/solicitudes/rechazar', async (req, res) => {
  await eliminarSolicitud(parEsquema.parse(req.body));
  res.status(204).end();
});
