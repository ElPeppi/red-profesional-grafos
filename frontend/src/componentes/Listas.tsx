import { useCallback, useEffect, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router';
import { plural } from '../utiles';
import { clasesBoton } from './ui';

/** La página viene de la URL, donde cualquiera puede escribir: lo inválido vale 1. */
export function leerPagina(valor: string | null) {
  const pagina = Number(valor);
  return Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;
}

/** Página en la URL: recargar o volver atrás conserva dónde estabas. */
export function usePaginaEnUrl() {
  const [parametros, setParametros] = useSearchParams();
  const pagina = leerPagina(parametros.get('pagina'));

  const irA = useCallback(
    (nueva: number, opciones?: { replace: boolean }) => {
      setParametros((actuales) => {
        const nuevos = new URLSearchParams(actuales);
        if (nueva > 1) nuevos.set('pagina', String(nueva));
        else nuevos.delete('pagina');
        return nuevos;
      }, opciones);
    },
    [setParametros],
  );

  return { pagina, irA, parametros, setParametros };
}

/** Si la página ya no existe (se borró lo último que tenía, o la URL es vieja), va a la última. */
export function useTopeDePagina(pagina: number, ultima: number, vigente: boolean, irA: (p: number, o?: { replace: boolean }) => void) {
  const fuera = vigente && pagina > ultima;
  useEffect(() => {
    if (fuera) irA(ultima, { replace: true });
  }, [fuera, ultima, irA]);
  return fuera;
}

export const ultimaPagina = (total: number | undefined, porPagina: number) =>
  Math.max(1, Math.ceil((total ?? 0) / porPagina));

interface PropsEncabezado {
  titulo: string;
  total: number | undefined;
  singular: string;
  varias: string;
  rutaNueva: string;
  textoNueva: string;
  children?: ReactNode;
}

export function EncabezadoLista({ titulo, total, singular, varias, rutaNueva, textoNueva, children }: PropsEncabezado) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="mt-1 text-sm text-suave" role="status">
          {total === undefined ? ' ' : plural(total, singular, varias)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {children}
        <Link to={rutaNueva} className={clasesBoton.primario}>
          {textoNueva}
        </Link>
      </div>
    </div>
  );
}

export function TarjetaEnlace({ ruta, titulo, children }: { ruta: string; titulo: string; children: ReactNode }) {
  return (
    <li>
      <Link
        to={ruta}
        className="flex h-full flex-col gap-1 rounded-xl border border-borde bg-tarjeta p-4 transition-colors hover:border-marca"
      >
        <span className="font-semibold">{titulo}</span>
        {children}
      </Link>
    </li>
  );
}
