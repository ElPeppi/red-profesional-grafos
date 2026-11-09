import { consulta } from '../consultas.js';
import { leer } from '../neo4j.js';
import { obtenerEmpresa } from './empresas.js';
import { obtenerOferta } from './ofertas.js';
import { obtenerProyecto } from './proyectos.js';
import { obtenerUsuario } from './usuarios.js';

const SIMILARES = consulta('usuariosSimilares');
const CONTACTOS_EN_COMUN = consulta('contactosEnComun');
const RUTA_A_EMPRESA = consulta('rutaAEmpresa');
const RUTA_A_OFERTA = consulta('rutaAOferta');
const RECOMENDAR_CONTACTOS = consulta('recomendarContactos');
const RECOMENDAR_EMPLEOS = consulta('recomendarEmpleos');
const CANDIDATOS = consulta('candidatosParaOferta');
const RELACIONADOS = consulta('proyectosRelacionados');
const COLABORADORES = consulta('recomendarColaboradores');

// Estas consultas dan 0 filas tanto si el nodo no existe como si no hay resultados.
// Por eso cada función revisa antes el nodo: 404 en el primer caso, lista vacía en el segundo.

export async function usuariosSimilares(usuarioId: string) {
  await obtenerUsuario(usuarioId);
  return { datos: await leer(SIMILARES, { usuarioId }) };
}

export async function contactosEnComun(usuarioId: string, otroUsuarioId: string) {
  await Promise.all([obtenerUsuario(usuarioId), obtenerUsuario(otroUsuarioId)]);
  return { datos: await leer(CONTACTOS_EN_COMUN, { usuarioId, otroUsuarioId }) };
}

// Sin camino no es un error: ruta llega en null y el frontend lo explica.
export async function rutaAEmpresa(usuarioId: string, empresaId: string) {
  await Promise.all([obtenerUsuario(usuarioId), obtenerEmpresa(empresaId)]);
  const [ruta] = await leer(RUTA_A_EMPRESA, { usuarioId, empresaId });
  return { ruta: ruta ?? null };
}

export async function rutaAOferta(usuarioId: string, ofertaId: string) {
  await Promise.all([obtenerUsuario(usuarioId), obtenerOferta(ofertaId)]);
  const [ruta] = await leer(RUTA_A_OFERTA, { usuarioId, ofertaId });
  return { ruta: ruta ?? null };
}

export async function recomendarContactos(usuarioId: string) {
  await obtenerUsuario(usuarioId);
  return { datos: await leer(RECOMENDAR_CONTACTOS, { usuarioId }) };
}

export async function recomendarEmpleos(usuarioId: string) {
  await obtenerUsuario(usuarioId);
  return { datos: await leer(RECOMENDAR_EMPLEOS, { usuarioId }) };
}

export async function candidatosParaOferta(ofertaId: string) {
  await obtenerOferta(ofertaId);
  return { datos: await leer(CANDIDATOS, { ofertaId }) };
}

export async function proyectosRelacionados() {
  return { datos: await leer(RELACIONADOS) };
}

export async function recomendarColaboradores(proyectoId: string) {
  await obtenerProyecto(proyectoId);
  return { datos: await leer(COLABORADORES, { proyectoId }) };
}
