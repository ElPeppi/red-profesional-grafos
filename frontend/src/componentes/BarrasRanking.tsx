import type { ReactNode } from 'react';
import { AZUL } from '../colores';

export interface FilaRanking {
  clave: string;
  nombre: ReactNode;
  detalle: string;
  valor: number;
  etiqueta: string;
}

/** Barras desde cero en un solo color: lo que importa es la longitud, y el valor va escrito. */
export function BarrasRanking({ filas }: { filas: FilaRanking[] }) {
  const maximo = Math.max(...filas.map((f) => f.valor), 1);

  return (
    <ol className="flex flex-col gap-3">
      {filas.map((fila) => (
        <li key={fila.clave} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fila.nombre}</p>
            <p className="truncate text-xs text-suave">{fila.detalle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-3 rounded-r"
              style={{ width: `calc((100% - 3rem) * ${fila.valor / maximo})`, backgroundColor: AZUL }}
            />
            <span className="text-sm tabular-nums">{fila.etiqueta}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
