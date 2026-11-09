import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { enTransaccion, enTx, escribir, leer } from '../neo4j.js';
import { ofertaNoEncontrada } from './ofertas.js';
import { usuarioNoEncontrado } from './usuarios.js';

const ESTADO = consulta('estadoDePostulacion');
const CREAR = consulta('crearPostulacion');
const CAMBIAR_ESTADO = consulta('cambiarEstadoPostulacion');
const POSTULANTES = consulta('postulantesDeOferta');
const DE_USUARIO = consulta('postulacionesDeUsuario');

export interface Postulacion {
  usuarioId: string;
  ofertaId: string;
}

export function crearPostulacion(postulacion: Postulacion) {
  // Revisar y crear en la misma transacción, igual que las solicitudes de conexión.
  return enTransaccion(async (tx) => {
    const [estado] = await enTx(tx, ESTADO, { ...postulacion });
    if (!estado) throw new ErrorApp(404, 'NO_ENCONTRADO', 'No existe el usuario o la oferta');
    if (estado.estadoOferta !== 'abierta') throw new ErrorApp(409, 'OFERTA_CERRADA', 'La oferta ya no recibe postulaciones');
    if (estado.yaPostulado) throw new ErrorApp(409, 'YA_POSTULADO', 'Ya te postulaste a esta oferta');

    const [creada] = await enTx(tx, CREAR, { ...postulacion });
    return creada;
  });
}

export async function cambiarEstadoPostulacion(postulacion: Postulacion, estado: string) {
  const [fila] = await escribir(CAMBIAR_ESTADO, { ...postulacion, estado });
  if (!fila) throw new ErrorApp(404, 'POSTULACION_NO_ENCONTRADA', 'Ese usuario no se ha postulado a esa oferta');
  return fila;
}

export async function listarPostulantes(ofertaId: string) {
  const [fila] = await leer(POSTULANTES, { ofertaId });
  if (!fila) throw ofertaNoEncontrada(ofertaId);
  return fila;
}

export async function listarPostulaciones(usuarioId: string) {
  const [fila] = await leer(DE_USUARIO, { usuarioId });
  if (!fila) throw usuarioNoEncontrado(usuarioId);
  return fila;
}
