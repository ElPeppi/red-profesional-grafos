import { Link, useRouteError } from 'react-router';
import { MensajeError, Vacio } from '../componentes/ui';

const ENLACE_INICIO = 'font-semibold text-marca underline';

export function NoEncontrada() {
  return (
    <Vacio>
      Esta página no existe.{' '}
      <Link to="/" className={ENLACE_INICIO}>
        Ir al inicio
      </Link>
    </Vacio>
  );
}

export function ErrorDeRuta() {
  const error = useRouteError();
  console.error(error);

  return (
    <main className="mx-auto flex max-w-xl flex-col gap-4 px-5 py-16">
      <MensajeError error={error} />
      <Link to="/" className={ENLACE_INICIO}>
        Ir al inicio
      </Link>
    </main>
  );
}
