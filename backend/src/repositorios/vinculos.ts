import { consulta } from '../consultas.js';
import { ErrorApp } from '../errores.js';
import { entero, escribir } from '../neo4j.js';
import { quitarVinculo } from './comun.js';

const PONER_HABILIDAD = consulta('ponerHabilidadUsuario');
const QUITAR_HABILIDAD = consulta('quitarHabilidadUsuario');
const PONER_EMPLEO = consulta('ponerEmpleo');
const QUITAR_EMPLEO = consulta('quitarEmpleo');
const PONER_PARTICIPACION = consulta('ponerParticipacion');
const QUITAR_PARTICIPACION = consulta('quitarParticipacion');

export interface DatosEmpleo {
  cargo: string;
  desde: string;
  actual: boolean;
}

const faltaAlguno = (cual: string) => new ErrorApp(404, 'NO_ENCONTRADO', `No existe el usuario o ${cual}`);

export async function ponerHabilidad(usuarioId: string, habilidadId: string, nivel: number) {
  const [fila] = await escribir(PONER_HABILIDAD, { usuarioId, habilidadId, nivel: entero(nivel) });
  if (!fila) throw faltaAlguno('la habilidad');
  return fila.habilidad;
}

export const quitarHabilidad = (usuarioId: string, habilidadId: string) =>
  quitarVinculo(QUITAR_HABILIDAD, { usuarioId, habilidadId }, 'El usuario no tiene esa habilidad');

export async function ponerEmpleo(usuarioId: string, empresaId: string, datos: DatosEmpleo) {
  const [fila] = await escribir(PONER_EMPLEO, { ...datos, usuarioId, empresaId });
  if (!fila) throw faltaAlguno('la empresa');
  return fila.empleo;
}

export const quitarEmpleo = (usuarioId: string, empresaId: string) =>
  quitarVinculo(QUITAR_EMPLEO, { usuarioId, empresaId }, 'El usuario no tiene un empleo en esa empresa');

export async function ponerParticipacion(usuarioId: string, proyectoId: string, rol: string) {
  const [fila] = await escribir(PONER_PARTICIPACION, { usuarioId, proyectoId, rol });
  if (!fila) throw faltaAlguno('el proyecto');
  return fila.proyecto;
}

export const quitarParticipacion = (usuarioId: string, proyectoId: string) =>
  quitarVinculo(QUITAR_PARTICIPACION, { usuarioId, proyectoId }, 'El usuario no participa en ese proyecto');
