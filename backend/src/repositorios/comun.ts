import { ErrorApp } from '../errores.js';
import { enTransaccion, enTx, escribir } from '../neo4j.js';

export const ciudadNoEncontrada = (id: string) =>
  new ErrorApp(422, 'CIUDAD_NO_ENCONTRADA', `No existe la ciudad ${id}`);

interface ConsultasDeActualizacion {
  actualizar: string;
  cambiarCiudad: string;
  noEncontrado: (id: string) => ErrorApp;
}

/** Propiedades y ciudad van juntas: si la ciudad no existe, no se guarda ningún cambio. */
export function actualizarConCiudad(
  { actualizar, cambiarCiudad, noEncontrado }: ConsultasDeActualizacion,
  id: string,
  cambios: Record<string, unknown>,
  ciudadId?: string,
) {
  return enTransaccion(async (tx) => {
    const [fila] = await enTx(tx, actualizar, { id, cambios });
    if (!fila) throw noEncontrado(id);
    if (!ciudadId) return fila;

    const [cambio] = await enTx(tx, cambiarCiudad, { id, ciudadId });
    if (!cambio) throw ciudadNoEncontrada(ciudadId);
    const [final] = await enTx(tx, actualizar, { id, cambios: {} });
    return final;
  });
}

/** Borra una relación. La consulta devuelve eliminadas: 0 si el vínculo no existía. */
export async function quitarVinculo(consulta: string, parametros: Record<string, unknown>, mensaje: string) {
  const [fila] = await escribir(consulta, parametros);
  if (fila?.eliminadas === 0) throw new ErrorApp(404, 'VINCULO_NO_ENCONTRADO', mensaje);
}
