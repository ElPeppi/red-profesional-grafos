import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { ErrorApi } from '../api/cliente';
import { iniciales } from '../utiles';

const BASE_BOTON =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50';

export const clasesBoton = {
  primario: `${BASE_BOTON} bg-marca text-white hover:bg-marca-fuerte`,
  secundario: `${BASE_BOTON} border border-borde bg-tarjeta text-tinta hover:border-suave`,
  peligro: `${BASE_BOTON} bg-peligro text-white hover:brightness-90`,
  peligroSuave: `${BASE_BOTON} border border-borde bg-tarjeta text-peligro hover:bg-peligro-suave`,
};

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: keyof typeof clasesBoton;
}

export function Boton({ variante = 'secundario', type = 'button', ...resto }: PropsBoton) {
  return <button type={type} className={clasesBoton[variante]} {...resto} />;
}

const TONOS_AVATAR = [
  'bg-marca-suave text-marca-fuerte',
  'bg-amber-100 text-amber-900',
  'bg-sky-100 text-sky-900',
  'bg-rose-100 text-rose-900',
  'bg-violet-100 text-violet-900',
];

export function Avatar({ nombre, grande = false }: { nombre: string; grande?: boolean }) {
  const suma = Array.from(nombre).reduce((total, letra) => total + (letra.codePointAt(0) ?? 0), 0);
  const tono = TONOS_AVATAR[suma % TONOS_AVATAR.length];
  const tamano = grande ? 'size-16 text-xl' : 'size-9 text-sm';

  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${tamano} ${tono}`}
    >
      {iniciales(nombre)}
    </span>
  );
}

export const clasesBotonTexto =
  'text-xs font-semibold text-suave underline-offset-2 hover:text-tinta hover:underline disabled:opacity-50';

interface PropsTarjeta {
  titulo: string;
  accion?: ReactNode;
  children: ReactNode;
}

/** Sección con nombre propio: un lector de pantalla puede saltar entre ellas. */
export function Tarjeta({ titulo, accion, children }: PropsTarjeta) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-3 rounded-xl border border-borde bg-tarjeta p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id={id} className="text-base font-bold">
          {titulo}
        </h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

export function Insignia({ children, tenue = false }: { children: ReactNode; tenue?: boolean }) {
  const tono = tenue ? 'bg-borde/60 text-suave' : 'bg-marca-suave text-marca-fuerte';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${tono}`}>
      {children}
    </span>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <p role="status" className="py-10 text-center text-sm text-suave">
      {texto}
    </p>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-borde px-6 py-10 text-center text-sm text-suave">
      {children}
    </div>
  );
}

export function MensajeError({ error, alReintentar }: { error: unknown; alReintentar?: () => void }) {
  const mensaje = error instanceof ErrorApi ? error.message : 'Algo salió mal. Inténtalo de nuevo.';

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-peligro-suave px-4 py-3 text-sm text-peligro"
    >
      <span>{mensaje}</span>
      {alReintentar && <Boton onClick={alReintentar}>Reintentar</Boton>}
    </div>
  );
}

/** Error corto junto a un botón o una fila, sin el bloque grande de MensajeError. */
export function TextoDeError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p role="alert" className="text-sm text-peligro">
      {error instanceof ErrorApi ? error.message : 'Algo salió mal. Inténtalo de nuevo.'}
    </p>
  );
}

interface PropsControl {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
}

interface PropsCampo {
  etiqueta: string;
  error?: string | undefined;
  children: (control: PropsControl) => ReactNode;
}

/** Une etiqueta, control y error: el lector de pantalla anuncia el error junto al campo. */
export function Campo({ etiqueta, error, children }: PropsCampo) {
  const id = useId();
  const idError = `${id}-error`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold">
        {etiqueta}
      </label>
      {children({ id, 'aria-invalid': Boolean(error), 'aria-describedby': error ? idError : undefined })}
      {error && (
        <p id={idError} className="text-sm text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}

export const clasesControl =
  'w-full rounded-lg border border-borde bg-tarjeta px-3 py-2 text-sm placeholder:text-suave aria-invalid:border-peligro';
