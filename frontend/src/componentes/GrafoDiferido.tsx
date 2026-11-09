import { lazy, Suspense } from 'react';
import type { PropsGrafo } from './GrafoRed';
import { Cargando } from './ui';

// La librería del grafo pesa más que el resto de la app: solo baja si se abre una vista que la usa.
const GrafoPerezoso = lazy(() => import('./GrafoRed').then((modulo) => ({ default: modulo.GrafoRed })));

export function GrafoDiferido(props: PropsGrafo) {
  return (
    <Suspense fallback={<Cargando texto="Preparando el grafo…" />}>
      <GrafoPerezoso {...props} />
    </Suspense>
  );
}
