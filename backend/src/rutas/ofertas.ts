import { Router } from 'express';
import { z } from 'zod';
import { paginaEsquema } from '../paginacion.js';
import {
  actualizarOferta,
  crearOferta,
  eliminarOferta,
  listarOfertas,
  obtenerOferta,
  ponerHabilidadOferta,
  quitarHabilidadOferta,
} from '../repositorios/ofertas.js';
import { cambiarEstadoPostulacion, crearPostulacion, listarPostulantes } from '../repositorios/postulaciones.js';
import { candidatosParaOferta } from '../repositorios/recomendaciones.js';
import { alMenosUnCampo, nivelHabilidad } from './validacion.js';

const estadoOferta = z.enum(['abierta', 'cerrada']);

const datosOferta = {
  titulo: z.string().trim().min(1, 'El título es obligatorio').max(150),
  nivel: z.enum(['junior', 'semi-senior', 'senior']),
  modalidad: z.enum(['presencial', 'híbrido', 'remoto']),
  ciudadId: z.string().min(1, 'La ciudad es obligatoria'),
};

// El estado no se envía al crear: toda oferta nace abierta.
const crearEsquema = z.strictObject({
  ...datosOferta,
  empresaId: z.string().min(1, 'La empresa es obligatoria'),
});

const cambiosEsquema = z
  .strictObject({ ...datosOferta, estado: estadoOferta })
  .partial()
  .refine(...alMenosUnCampo);

const listadoEsquema = paginaEsquema.extend({ estado: estadoOferta.optional() });

const requisitoEsquema = z.strictObject({
  nivelMinimo: nivelHabilidad,
  obligatoria: z.boolean().default(false),
});

const postulacionEsquema = z.strictObject({
  usuarioId: z.string().min(1, 'Falta el usuario'),
});

const cambioPostulacionEsquema = z.strictObject({
  estado: z.enum(['enviada', 'en revisión', 'entrevista', 'rechazada', 'aceptada']),
});

export const rutasOfertas = Router();

rutasOfertas.post('/', async (req, res) => {
  res.status(201).json(await crearOferta(crearEsquema.parse(req.body)));
});

rutasOfertas.get('/', async (req, res) => {
  const { estado, ...pagina } = listadoEsquema.parse(req.query);
  res.json(await listarOfertas(estado, pagina));
});

rutasOfertas.get('/:id', async (req, res) => {
  res.json(await obtenerOferta(req.params.id));
});

rutasOfertas.patch('/:id', async (req, res) => {
  res.json(await actualizarOferta(req.params.id, cambiosEsquema.parse(req.body)));
});

rutasOfertas.delete('/:id', async (req, res) => {
  await eliminarOferta(req.params.id);
  res.status(204).end();
});

rutasOfertas.get('/:id/candidatos', async (req, res) => {
  res.json(await candidatosParaOferta(req.params.id));
});

rutasOfertas.put('/:id/habilidades/:habilidadId', async (req, res) => {
  res.json(await ponerHabilidadOferta(req.params.id, req.params.habilidadId, requisitoEsquema.parse(req.body)));
});

rutasOfertas.delete('/:id/habilidades/:habilidadId', async (req, res) => {
  await quitarHabilidadOferta(req.params.id, req.params.habilidadId);
  res.status(204).end();
});

rutasOfertas.post('/:id/postulaciones', async (req, res) => {
  const { usuarioId } = postulacionEsquema.parse(req.body);
  res.status(201).json(await crearPostulacion({ usuarioId, ofertaId: req.params.id }));
});

rutasOfertas.get('/:id/postulaciones', async (req, res) => {
  res.json(await listarPostulantes(req.params.id));
});

rutasOfertas.patch('/:id/postulaciones/:usuarioId', async (req, res) => {
  const { estado } = cambioPostulacionEsquema.parse(req.body);
  res.json(await cambiarEstadoPostulacion({ usuarioId: req.params.usuarioId, ofertaId: req.params.id }, estado));
});
