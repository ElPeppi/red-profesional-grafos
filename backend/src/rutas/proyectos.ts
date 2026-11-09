import { Router } from 'express';
import { z } from 'zod';
import { paginaEsquema } from '../paginacion.js';
import {
  actualizarProyecto,
  crearProyecto,
  eliminarProyecto,
  listarProyectos,
  obtenerProyecto,
  ponerTecnologia,
  quitarTecnologia,
} from '../repositorios/proyectos.js';
import { proyectosRelacionados, recomendarColaboradores } from '../repositorios/recomendaciones.js';
import { alMenosUnCampo } from './validacion.js';

const datosProyecto = {
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(150),
  descripcion: z.string().trim().max(500),
  estado: z.enum(['en curso', 'finalizado']),
};

// Sin empresa es un proyecto comunitario.
const crearEsquema = z.strictObject({
  ...datosProyecto,
  descripcion: datosProyecto.descripcion.default(''),
  estado: datosProyecto.estado.default('en curso'),
  empresaId: z.string().min(1).optional(),
});

const cambiosEsquema = z.strictObject(datosProyecto).partial().refine(...alMenosUnCampo);

export const rutasProyectos = Router();

rutasProyectos.post('/', async (req, res) => {
  res.status(201).json(await crearProyecto(crearEsquema.parse(req.body)));
});

rutasProyectos.get('/', async (req, res) => {
  res.json(await listarProyectos(paginaEsquema.parse(req.query)));
});

// Antes de /:id: si no, Express tomaría "relacionados" como el id de un proyecto.
rutasProyectos.get('/relacionados', async (_req, res) => {
  res.json(await proyectosRelacionados());
});

rutasProyectos.get('/:id', async (req, res) => {
  res.json(await obtenerProyecto(req.params.id));
});

rutasProyectos.get('/:id/colaboradores', async (req, res) => {
  res.json(await recomendarColaboradores(req.params.id));
});

rutasProyectos.patch('/:id', async (req, res) => {
  res.json(await actualizarProyecto(req.params.id, cambiosEsquema.parse(req.body)));
});

rutasProyectos.delete('/:id', async (req, res) => {
  await eliminarProyecto(req.params.id);
  res.status(204).end();
});

rutasProyectos.put('/:id/habilidades/:habilidadId', async (req, res) => {
  res.json(await ponerTecnologia(req.params.id, req.params.habilidadId));
});

rutasProyectos.delete('/:id/habilidades/:habilidadId', async (req, res) => {
  await quitarTecnologia(req.params.id, req.params.habilidadId);
  res.status(204).end();
});
