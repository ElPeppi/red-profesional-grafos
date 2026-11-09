import { Router } from 'express';
import {
  contactosEnComun,
  recomendarContactos,
  recomendarEmpleos,
  rutaAEmpresa,
  rutaAOferta,
  usuariosSimilares,
} from '../repositorios/recomendaciones.js';

export const rutasRecomendaciones = Router();

rutasRecomendaciones.get('/:id/similares', async (req, res) => {
  res.json(await usuariosSimilares(req.params.id));
});

rutasRecomendaciones.get('/:id/contactos-comunes/:otroId', async (req, res) => {
  res.json(await contactosEnComun(req.params.id, req.params.otroId));
});

rutasRecomendaciones.get('/:id/ruta-empresa/:empresaId', async (req, res) => {
  res.json(await rutaAEmpresa(req.params.id, req.params.empresaId));
});

rutasRecomendaciones.get('/:id/ruta-oferta/:ofertaId', async (req, res) => {
  res.json(await rutaAOferta(req.params.id, req.params.ofertaId));
});

rutasRecomendaciones.get('/:id/recomendaciones/contactos', async (req, res) => {
  res.json(await recomendarContactos(req.params.id));
});

rutasRecomendaciones.get('/:id/recomendaciones/empleos', async (req, res) => {
  res.json(await recomendarEmpleos(req.params.id));
});
