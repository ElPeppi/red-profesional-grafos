import { randomUUID } from 'node:crypto';
import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { entero, escribir, leer } from '../neo4j.js';
import { aSaltoYLimite, type Pagina } from '../paginacion.js';
import { actualizarConCiudad, ciudadNoEncontrada } from './comun.js';

const CREAR = consulta('crearUsuario');
const LISTAR = consulta('listarUsuarios');
const CONTAR = consulta('contarUsuarios');
const BUSCAR = consulta('buscarUsuarios');
const CONTAR_BUSQUEDA = consulta('contarBusquedaUsuarios');
const OBTENER = consulta('obtenerUsuario');
const ACTUALIZAR = consulta('actualizarUsuario');
const CAMBIAR_CIUDAD = consulta('cambiarCiudadUsuario');
const ELIMINAR = consulta('eliminarUsuario');

export interface DatosUsuario {
  nombre: string;
  email: string;
  titular: string;
  aniosExperiencia: number;
  abiertoAOfertas: boolean;
  ciudadId: string;
}

export type CambiosUsuario = Partial<DatosUsuario>;

export const usuarioNoEncontrado = (id: string) =>
  new ErrorApp(404, 'USUARIO_NO_ENCONTRADO', `No existe el usuario ${id}`);

const ACTUALIZACION = { actualizar: ACTUALIZAR, cambiarCiudad: CAMBIAR_CIUDAD, noEncontrado: usuarioNoEncontrado };

export async function crearUsuario(datos: DatosUsuario) {
  const filas = await escribir(CREAR, {
    ...datos,
    id: randomUUID(),
    aniosExperiencia: entero(datos.aniosExperiencia),
  });
  if (!filas[0]) throw ciudadNoEncontrada(datos.ciudadId);
  return filas[0].usuario;
}

export async function listarUsuarios(paginaPedida: Pagina) {
  const [filas, conteo] = await Promise.all([leer(LISTAR, aSaltoYLimite(paginaPedida)), leer(CONTAR)]);
  return { datos: filas.map((f) => f.usuario), total: conteo[0]?.total ?? 0, ...paginaPedida };
}

/**
 * Convierte el texto del usuario en una búsqueda Lucene. Cada palabra debe aparecer,
 * por prefijo ("car" encuentra Carlos) o con un error de distancia ("mejia" encuentra Mejía).
 * Solo conserva letras y números, porque ( " : y similares son sintaxis de Lucene
 * y romperían la consulta. Devuelve null si no queda ninguna palabra.
 */
export function terminoLucene(texto: string): string | null {
  const palabras = texto.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
  if (palabras.length === 0) return null;
  return palabras.map((p) => `(${p}* OR ${p}~1)`).join(' AND ');
}

export async function buscarUsuarios(texto: string, paginaPedida: Pagina) {
  const termino = terminoLucene(texto);
  if (!termino) return { datos: [], total: 0, ...paginaPedida };

  const [filas, conteo] = await Promise.all([
    leer(BUSCAR, { termino, ...aSaltoYLimite(paginaPedida) }),
    leer(CONTAR_BUSQUEDA, { termino }),
  ]);
  return { datos: filas.map((f) => f.usuario), total: conteo[0]?.total ?? 0, ...paginaPedida };
}

export async function obtenerUsuario(id: string) {
  const filas = await leer(OBTENER, { id });
  if (!filas[0]) throw usuarioNoEncontrado(id);
  return filas[0].usuario;
}

export async function actualizarUsuario(id: string, cambios: CambiosUsuario) {
  const { ciudadId, aniosExperiencia, ...resto } = cambios;
  const propiedades = {
    ...resto,
    ...(aniosExperiencia !== undefined && { aniosExperiencia: entero(aniosExperiencia) }),
  };

  const fila = await actualizarConCiudad(ACTUALIZACION, id, propiedades, ciudadId);
  return fila?.usuario;
}

export async function eliminarUsuario(id: string) {
  const filas = await escribir(ELIMINAR, { id });
  if (filas[0]?.eliminados === 0) throw usuarioNoEncontrado(id);
}
