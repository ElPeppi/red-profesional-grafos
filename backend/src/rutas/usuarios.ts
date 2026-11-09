import { Router } from 'express';
import { z } from 'zod';
import { paginaEsquema } from '../paginacion.js';
import {
  actualizarUsuario,
  buscarUsuarios,
  crearUsuario,
  eliminarUsuario,
  listarUsuarios,
  obtenerUsuario,
} from '../repositorios/usuarios.js';
import { alMenosUnCampo } from './validacion.js';

const datosUsuario = {
  nombre: z.string().trim().min(1, 'El nombre es obligatorio').max(120, 'Máximo 120 caracteres'),
  // El constraint distingue mayúsculas: en minúsculas, Ana@x.com y ana@x.com son el mismo.
  email: z.string().trim().toLowerCase().pipe(z.email('Email inválido')),
  titular: z.string().trim().max(200, 'Máximo 200 caracteres'),
  aniosExperiencia: z
    .number('Escribe un número entero')
    .int('Escribe un número entero')
    .min(0, 'No puede ser negativo')
    .max(80, 'No puede pasar de 80'),
  abiertoAOfertas: z.boolean(),
  ciudadId: z.string().min(1, 'La ciudad es obligatoria'),
};

// strict rechaza campos desconocidos: nadie puede enviar id o creadoEn para sobrescribirlos.
const crearEsquema = z.strictObject({
  ...datosUsuario,
  titular: datosUsuario.titular.default(''),
  aniosExperiencia: datosUsuario.aniosExperiencia.default(0),
  abiertoAOfertas: datosUsuario.abiertoAOfertas.default(false),
});

// Sin los valores por defecto: en un PATCH, lo que no llega no debe cambiar.
const actualizarEsquema = z.strictObject(datosUsuario).partial().refine(...alMenosUnCampo);

const listadoEsquema = paginaEsquema.extend({
  busqueda: z.string().trim().max(100).optional(),
});

export const rutasUsuarios = Router();

rutasUsuarios.post('/', async (req, res) => {
  res.status(201).json(await crearUsuario(crearEsquema.parse(req.body)));
});

rutasUsuarios.get('/', async (req, res) => {
  const { busqueda, ...pagina } = listadoEsquema.parse(req.query);
  res.json(busqueda ? await buscarUsuarios(busqueda, pagina) : await listarUsuarios(pagina));
});

rutasUsuarios.get('/:id', async (req, res) => {
  res.json(await obtenerUsuario(req.params.id));
});

rutasUsuarios.patch('/:id', async (req, res) => {
  res.json(await actualizarUsuario(req.params.id, actualizarEsquema.parse(req.body)));
});

rutasUsuarios.delete('/:id', async (req, res) => {
  await eliminarUsuario(req.params.id);
  res.status(204).end();
});
