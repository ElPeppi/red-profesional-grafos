import { randomUUID } from 'node:crypto';
import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { entero, escribir, leer } from '../neo4j.js';
import { aSaltoYLimite, type Pagina } from '../paginacion.js';
import { actualizarConCiudad, quitarVinculo } from './comun.js';

const CREAR = consulta('crearOferta');
const LISTAR = consulta('listarOfertas');
const OBTENER = consulta('obtenerOferta');
const ACTUALIZAR = consulta('actualizarOferta');
const CAMBIAR_CIUDAD = consulta('cambiarCiudadOferta');
const ELIMINAR = consulta('eliminarOferta');
const PONER_HABILIDAD = consulta('ponerHabilidadOferta');
const QUITAR_HABILIDAD = consulta('quitarHabilidadOferta');

export interface DatosOferta {
  empresaId: string;
  ciudadId: string;
  titulo: string;
  nivel: string;
  modalidad: string;
}

export interface CambiosOferta {
  titulo?: string;
  nivel?: string;
  modalidad?: string;
  estado?: string;
  ciudadId?: string;
}

export interface RequisitoOferta {
  nivelMinimo: number;
  obligatoria: boolean;
}

export const ofertaNoEncontrada = (id: string) => new ErrorApp(404, 'OFERTA_NO_ENCONTRADA', `No existe la oferta ${id}`);

const ACTUALIZACION = { actualizar: ACTUALIZAR, cambiarCiudad: CAMBIAR_CIUDAD, noEncontrado: ofertaNoEncontrada };

export async function crearOferta(datos: DatosOferta) {
  const [fila] = await escribir(CREAR, { ...datos, id: randomUUID() });
  if (!fila) throw new ErrorApp(422, 'EMPRESA_O_CIUDAD_NO_ENCONTRADA', 'No existe la empresa o la ciudad');
  return fila.oferta;
}

export async function listarOfertas(estado: string | undefined, pagina: Pagina) {
  // null y no undefined: Neo4j exige recibir todos los parámetros de la consulta.
  const [fila] = await leer(LISTAR, { estado: estado ?? null, ...aSaltoYLimite(pagina) });
  return { ...fila, ...pagina };
}

export async function obtenerOferta(id: string) {
  const [fila] = await leer(OBTENER, { id });
  if (!fila) throw ofertaNoEncontrada(id);
  return fila.oferta;
}

export async function actualizarOferta(id: string, { ciudadId, ...cambios }: CambiosOferta) {
  const fila = await actualizarConCiudad(ACTUALIZACION, id, cambios, ciudadId);
  return fila?.oferta;
}

export async function eliminarOferta(id: string) {
  const [fila] = await escribir(ELIMINAR, { id });
  if (fila?.eliminadas === 0) throw ofertaNoEncontrada(id);
}

export async function ponerHabilidadOferta(ofertaId: string, habilidadId: string, requisito: RequisitoOferta) {
  const [fila] = await escribir(PONER_HABILIDAD, {
    ofertaId,
    habilidadId,
    nivelMinimo: entero(requisito.nivelMinimo),
    obligatoria: requisito.obligatoria,
  });
  if (!fila) throw new ErrorApp(404, 'NO_ENCONTRADO', 'No existe la oferta o la habilidad');
  return fila.habilidad;
}

export const quitarHabilidadOferta = (ofertaId: string, habilidadId: string) =>
  quitarVinculo(QUITAR_HABILIDAD, { ofertaId, habilidadId }, 'La oferta no pide esa habilidad');
