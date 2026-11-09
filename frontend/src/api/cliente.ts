export interface CampoInvalido {
  campo: string;
  mensaje: string;
}

interface CuerpoError {
  codigo: string;
  mensaje: string;
  campos?: CampoInvalido[];
}

/** Error de la API o de la conexión, con un mensaje listo para mostrar. */
export class ErrorApi extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
    readonly campos: CampoInvalido[] = [],
  ) {
    super(mensaje);
  }
}

const sinConexion = (estado = 0) =>
  new ErrorApi(estado, 'SIN_CONEXION', 'No hay conexión con el servidor. Revisa que el backend esté encendido.');

function leerJson(texto: string): unknown {
  try {
    return JSON.parse(texto);
  } catch {
    return null;
  }
}

/** Mensaje del backend para un campo, para mostrarlo junto a su control. */
export const errorDeCampo = (error: unknown, campo: string) =>
  error instanceof ErrorApi ? error.campos.find((c) => c.campo === campo)?.mensaje : undefined;

interface Opciones {
  metodo?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  cuerpo?: unknown;
}

export async function pedir<T>(ruta: string, { metodo = 'GET', cuerpo }: Opciones = {}): Promise<T> {
  const conCuerpo = cuerpo !== undefined;

  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      method: metodo,
      headers: conCuerpo ? { 'content-type': 'application/json' } : undefined,
      body: conCuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw sinConexion();
  }

  // Un 204 viene sin cuerpo.
  const datos = leerJson(await respuesta.text());
  if (respuesta.ok) return datos as T;

  // Con el backend apagado responde el proxy de Vite: un 500 que no es JSON de la API.
  const error = datos as CuerpoError | null;
  if (!error?.codigo) throw sinConexion(respuesta.status);
  throw new ErrorApi(respuesta.status, error.codigo, error.mensaje, error.campos);
}
