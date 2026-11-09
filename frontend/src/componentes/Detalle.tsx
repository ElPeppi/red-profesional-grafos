import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorApi } from '../api/cliente';
import { useAccion } from '../utiles';
import { Boton, Cargando, MensajeError, Vacio } from './ui';

interface PropsDetalle<T> {
  consulta: UseQueryResult<T>;
  queNoExiste: string;
  rutaVolver: string;
  textoVolver: string;
  children: (datos: T) => ReactNode;
}

/** Los cuatro estados de una página de detalle: no existe, datos, error y cargando. */
export function Detalle<T>({ consulta, queNoExiste, rutaVolver, textoVolver, children }: PropsDetalle<T>) {
  const { data, error, refetch } = consulta;

  // Va antes que los datos: si lo borraron en otra pestaña, la copia en caché ya no vale.
  if (error instanceof ErrorApi && error.estado === 404) {
    return (
      <Vacio>
        {queNoExiste}{' '}
        <Link to={rutaVolver} className="font-semibold text-marca underline">
          {textoVolver}
        </Link>
      </Vacio>
    );
  }
  if (data) return children(data);
  if (error) return <MensajeError error={error} alReintentar={() => void refetch()} />;
  return <Cargando />;
}

interface PropsEncabezado {
  titulo: string;
  subtitulo: ReactNode;
  acciones: ReactNode;
}

export function Encabezado({ titulo, subtitulo, acciones }: PropsEncabezado) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-suave">{subtitulo}</div>
      </div>
      <div className="flex flex-wrap gap-2">{acciones}</div>
    </div>
  );
}

interface PropsConfirmar {
  abierto: boolean;
  titulo: string;
  detalle: string;
  alCerrar: () => void;
  alConfirmar: () => Promise<unknown>;
}

/** Confirmación de borrado. showModal, no el atributo open: atrapa el foco y cierra con Escape. */
export function ConfirmarEliminar({ abierto, titulo, detalle, alCerrar, alConfirmar }: PropsConfirmar) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const { ejecutar, error, ocupado } = useAccion();
  const [idTitulo] = useState(() => `titulo-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    if (abierto) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby={idTitulo}
      onClose={alCerrar}
      className="m-auto w-full max-w-md rounded-xl bg-tarjeta p-6 text-tinta shadow-xl"
    >
      <h2 id={idTitulo} className="text-lg font-bold">
        {titulo}
      </h2>
      <p className="mt-2 text-sm text-suave">{detalle}</p>
      {error ? (
        <div className="mt-4">
          <MensajeError error={error} />
        </div>
      ) : null}
      <div className="mt-6 flex justify-end gap-2">
        <Boton onClick={alCerrar}>Cancelar</Boton>
        <Boton variante="peligro" disabled={ocupado} onClick={() => void ejecutar(alConfirmar)}>
          {ocupado ? 'Eliminando…' : 'Eliminar'}
        </Boton>
      </div>
    </dialog>
  );
}
