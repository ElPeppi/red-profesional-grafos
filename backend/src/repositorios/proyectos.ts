import { randomUUID } from 'node:crypto';
import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { escribir, leer } from '../neo4j.js';
import { aSaltoYLimite, type Pagina } from '../paginacion.js';
import { quitarVinculo } from './comun.js';

const CREAR = consulta('crearProyecto');
const LISTAR = consulta('listarProyectos');
const OBTENER = consulta('obtenerProyecto');
const ACTUALIZAR = consulta('actualizarProyecto');
const ELIMINAR = consulta('eliminarProyecto');
const PONER_TECNOLOGIA = consulta('ponerTecnologia');
const QUITAR_TECNOLOGIA = consulta('quitarTecnologia');

export interface DatosProyecto {
  nombre: string;
  descripcion: string;
  estado: string;
  empresaId?: string | undefined;
}

export type CambiosProyecto = Partial<Omit<DatosProyecto, 'empresaId'>>;

const proyectoNoEncontrado = (id: string) => new ErrorApp(404, 'PROYECTO_NO_ENCONTRADO', `No existe el proyecto ${id}`);

export async function crearProyecto({ empresaId, ...datos }: DatosProyecto) {
  const [fila] = await escribir(CREAR, { ...datos, empresaId: empresaId ?? null, id: randomUUID() });
  if (!fila) throw new ErrorApp(422, 'EMPRESA_NO_ENCONTRADA', `No existe la empresa ${empresaId}`);
  return fila.proyecto;
}

export async function listarProyectos(pagina: Pagina) {
  const [fila] = await leer(LISTAR, aSaltoYLimite(pagina));
  return { ...fila, ...pagina };
}

export async function obtenerProyecto(id: string) {
  const [fila] = await leer(OBTENER, { id });
  if (!fila) throw proyectoNoEncontrado(id);
  return fila.proyecto;
}

export async function actualizarProyecto(id: string, cambios: CambiosProyecto) {
  const [fila] = await escribir(ACTUALIZAR, { id, cambios });
  if (!fila) throw proyectoNoEncontrado(id);
  return fila.proyecto;
}

export async function eliminarProyecto(id: string) {
  const [fila] = await escribir(ELIMINAR, { id });
  if (fila?.eliminados === 0) throw proyectoNoEncontrado(id);
}

export async function ponerTecnologia(proyectoId: string, habilidadId: string) {
  const [fila] = await escribir(PONER_TECNOLOGIA, { proyectoId, habilidadId });
  if (!fila) throw new ErrorApp(404, 'NO_ENCONTRADO', 'No existe el proyecto o la habilidad');
  return fila.habilidad;
}

export const quitarTecnologia = (proyectoId: string, habilidadId: string) =>
  quitarVinculo(QUITAR_TECNOLOGIA, { proyectoId, habilidadId }, 'El proyecto no usa esa tecnología');
