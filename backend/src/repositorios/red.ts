import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { enTransaccion, enTx, escribir, leer } from '../neo4j.js';
import { aSaltoYLimite, type Pagina } from '../paginacion.js';
import { usuarioNoEncontrado } from './usuarios.js';

const ESTADO = consulta('estadoDeConexion');
const CREAR_SOLICITUD = consulta('crearSolicitud');
const ACEPTAR = consulta('aceptarSolicitud');
const ELIMINAR_SOLICITUD = consulta('eliminarSolicitud');
const LISTAR_SOLICITUDES = consulta('listarSolicitudes');
const LISTAR_CONEXIONES = consulta('listarConexiones');

export interface ParDeUsuarios {
  solicitanteId: string;
  destinoId: string;
}

const solicitudNoEncontrada = ({ solicitanteId, destinoId }: ParDeUsuarios) =>
  new ErrorApp(404, 'SOLICITUD_NO_ENCONTRADA', `No hay solicitud pendiente de ${solicitanteId} a ${destinoId}`);

export async function crearSolicitud(par: ParDeUsuarios) {
  if (par.solicitanteId === par.destinoId) {
    throw new ErrorApp(422, 'SOLICITUD_INVALIDA', 'No puedes enviarte una solicitud a ti mismo');
  }

  // Revisar y crear en la misma transacción: la respuesta describe el estado real.
  return enTransaccion(async (tx) => {
    const [estado] = await enTx(tx, ESTADO, { ...par });
    if (!estado) throw new ErrorApp(404, 'USUARIO_NO_ENCONTRADO', 'Alguno de los dos usuarios no existe');
    if (estado.conectados) throw new ErrorApp(409, 'YA_CONECTADOS', 'Estos usuarios ya están conectados');
    if (estado.solicitudEnviada) throw new ErrorApp(409, 'SOLICITUD_PENDIENTE', 'La solicitud ya fue enviada');
    if (estado.solicitudRecibida) {
      throw new ErrorApp(409, 'SOLICITUD_INVERSA', 'Esa persona ya te envió una solicitud: acéptala');
    }

    const [creada] = await enTx(tx, CREAR_SOLICITUD, { ...par });
    return creada;
  });
}

export async function aceptarSolicitud(par: ParDeUsuarios) {
  const [conexion] = await escribir(ACEPTAR, { ...par });
  if (!conexion) throw solicitudNoEncontrada(par);
  return conexion;
}

export async function eliminarSolicitud(par: ParDeUsuarios) {
  const [resultado] = await escribir(ELIMINAR_SOLICITUD, { ...par });
  if (resultado?.eliminadas === 0) throw solicitudNoEncontrada(par);
}

/** Qué une hoy a dos personas: el frontend decide con esto qué botón mostrar. */
export async function relacionEntre(id: string, otroId: string) {
  if (id === otroId) {
    throw new ErrorApp(422, 'MISMA_PERSONA', 'Es la misma persona: no hay relación que consultar');
  }
  const [estado] = await leer(ESTADO, { solicitanteId: id, destinoId: otroId });
  if (!estado) throw new ErrorApp(404, 'USUARIO_NO_ENCONTRADO', 'Alguno de los dos usuarios no existe');
  return estado;
}

export async function listarSolicitudes(id: string) {
  const [fila] = await leer(LISTAR_SOLICITUDES, { id });
  if (!fila) throw usuarioNoEncontrado(id);
  return fila;
}

export async function listarConexiones(id: string, pagina: Pagina) {
  const [fila] = await leer(LISTAR_CONEXIONES, { id, ...aSaltoYLimite(pagina) });
  if (!fila) throw usuarioNoEncontrado(id);
  return { ...fila, ...pagina };
}
