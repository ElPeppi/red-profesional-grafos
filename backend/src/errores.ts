import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Neo4jError } from 'neo4j-driver';
import { ZodError } from 'zod';

/** Error esperado de la aplicación: lleva el código HTTP y un mensaje apto para el cliente. */
export class ErrorApp extends Error {
  constructor(
    readonly estado: number,
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
  }
}

export const rutaNoEncontrada: RequestHandler = (req, res) => {
  res.status(404).json({ codigo: 'RUTA_NO_ENCONTRADA', mensaje: `No existe ${req.method} ${req.path}` });
};

// Express reconoce el manejador de errores porque recibe cuatro argumentos.
export const manejarErrores: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ErrorApp) {
    res.status(error.estado).json({ codigo: error.codigo, mensaje: error.message });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      codigo: 'DATOS_INVALIDOS',
      mensaje: 'Revisa los datos enviados',
      campos: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
    return;
  }

  // express.json() marca así el cuerpo que no es JSON válido.
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ codigo: 'JSON_INVALIDO', mensaje: 'El cuerpo no es JSON válido' });
    return;
  }

  // Lo detecta la base, no el backend: dos peticiones simultáneas no pueden colarse.
  if (error instanceof Neo4jError && error.code === 'Neo.ClientError.Schema.ConstraintValidationFailed') {
    res.status(409).json({ codigo: 'YA_EXISTE', mensaje: 'Ya existe un registro con ese valor único' });
    return;
  }

  if (error instanceof Neo4jError && error.retriable) {
    res.status(503).json({ codigo: 'BASE_NO_DISPONIBLE', mensaje: 'La base de datos no está disponible' });
    return;
  }

  // Inesperado: el detalle queda en el log y nunca se envía al cliente.
  console.error(error);
  res.status(500).json({ codigo: 'ERROR_INTERNO', mensaje: 'Error interno del servidor' });
};
