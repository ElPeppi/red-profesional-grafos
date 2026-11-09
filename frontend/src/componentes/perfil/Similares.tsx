import { Link } from 'react-router';
import { useSimilares } from '../../api/recomendaciones';
import { listaLegible, plural } from '../../utiles';
import { Tarjeta, TextoDeError } from '../ui';

export function Similares({ id }: { id: string }) {
  const { data, error } = useSimilares(id);

  return (
    <Tarjeta titulo="Habilidades parecidas">
      <p className="-mt-2 text-xs text-suave">Jaccard: habilidades en común sobre todas las de los dos.</p>
      <TextoDeError error={error} />
      {data?.datos.length === 0 && <p className="text-sm text-suave">Nadie comparte sus habilidades todavía.</p>}
      <ul className="flex flex-col gap-2">
        {data?.datos.map((similar) => (
          <li key={similar.id} className="flex items-start justify-between gap-3 text-sm">
            <span className="min-w-0">
              <Link to={`/personas/${similar.id}`} className="font-semibold hover:underline">
                {similar.usuario}
              </Link>
              <span className="block text-xs text-suave">
                {plural(similar.compartidas.length, 'en común', 'en común')}: {listaLegible(similar.compartidas)}
              </span>
            </span>
            <span className="shrink-0 tabular-nums">{Math.round(similar.jaccard * 100)} %</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
