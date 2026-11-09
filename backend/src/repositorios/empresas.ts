import { randomUUID } from 'node:crypto';
import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { escribir, leer } from '../neo4j.js';
import { aSaltoYLimite, type Pagina } from '../paginacion.js';
import { actualizarConCiudad, ciudadNoEncontrada } from './comun.js';

const CREAR = consulta('crearEmpresa');
const LISTAR = consulta('listarEmpresas');
const OBTENER = consulta('obtenerEmpresa');
const ACTUALIZAR = consulta('actualizarEmpresa');
const CAMBIAR_CIUDAD = consulta('cambiarCiudadEmpresa');
const ELIMINAR = consulta('eliminarEmpresa');

export interface DatosEmpresa {
  nombre: string;
  sector: string;
  ciudadId: string;
}

const empresaNoEncontrada = (id: string) => new ErrorApp(404, 'EMPRESA_NO_ENCONTRADA', `No existe la empresa ${id}`);

const ACTUALIZACION = { actualizar: ACTUALIZAR, cambiarCiudad: CAMBIAR_CIUDAD, noEncontrado: empresaNoEncontrada };

export async function crearEmpresa(datos: DatosEmpresa) {
  const [fila] = await escribir(CREAR, { ...datos, id: randomUUID() });
  if (!fila) throw ciudadNoEncontrada(datos.ciudadId);
  return fila.empresa;
}

export async function listarEmpresas(pagina: Pagina) {
  const [fila] = await leer(LISTAR, aSaltoYLimite(pagina));
  return { ...fila, ...pagina };
}

export async function obtenerEmpresa(id: string) {
  const [fila] = await leer(OBTENER, { id });
  if (!fila) throw empresaNoEncontrada(id);
  return fila.empresa;
}

export async function actualizarEmpresa(id: string, { ciudadId, ...cambios }: Partial<DatosEmpresa>) {
  const fila = await actualizarConCiudad(ACTUALIZACION, id, cambios, ciudadId);
  return fila?.empresa;
}

export async function eliminarEmpresa(id: string) {
  const [fila] = await escribir(ELIMINAR, { id });
  if (!fila) throw empresaNoEncontrada(id);
  if (fila.ofertas !== 0) {
    throw new ErrorApp(409, 'EMPRESA_CON_OFERTAS', `Ofertas publicadas por la empresa: ${fila.ofertas}. Bórralas primero`);
  }
}
