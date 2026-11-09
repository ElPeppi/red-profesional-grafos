import { Router } from 'express';
import { z } from 'zod';
import { paginaEsquema } from '../paginacion.js';
import {
  actualizarEmpresa,
  crearEmpresa,
  eliminarEmpresa,
  listarEmpresas,
  obtenerEmpresa,
} from '../repositorios/empresas.js';
import { alMenosUnCampo } from './validacion.js';

const empresaEsquema = z.strictObject({
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120),
  sector: z.string().trim().min(1, 'El sector es obligatorio').max(120),
  ciudadId: z.string().min(1, 'La ciudad es obligatoria'),
});

const cambiosEsquema = empresaEsquema.partial().refine(...alMenosUnCampo);

export const rutasEmpresas = Router();

rutasEmpresas.post('/', async (req, res) => {
  res.status(201).json(await crearEmpresa(empresaEsquema.parse(req.body)));
});

rutasEmpresas.get('/', async (req, res) => {
  res.json(await listarEmpresas(paginaEsquema.parse(req.query)));
});

rutasEmpresas.get('/:id', async (req, res) => {
  res.json(await obtenerEmpresa(req.params.id));
});

rutasEmpresas.patch('/:id', async (req, res) => {
  res.json(await actualizarEmpresa(req.params.id, cambiosEsquema.parse(req.body)));
});

rutasEmpresas.delete('/:id', async (req, res) => {
  await eliminarEmpresa(req.params.id);
  res.status(204).end();
});
