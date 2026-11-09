import { useCallback, useMemo, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  useComunidades,
  useGrafoRed,
  useHabilidadesDemandadas,
  useInfluyentes,
  type AristaRed,
  type Comunidad,
  type NodoRed,
} from '../api/analitica';
import { BarrasRanking } from '../componentes/BarrasRanking';
import { GrafoDiferido } from '../componentes/GrafoDiferido';
import { Cargando, MensajeError } from '../componentes/ui';
import { colorDeComunidad } from '../colores';
import { plural } from '../utiles';


function Seccion({ titulo, ayuda, children }: { titulo: string; ayuda: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <div>
        <h2 className="text-xl font-bold">{titulo}</h2>
        <p className="text-sm text-suave">{ayuda}</p>
      </div>
      {children}
    </section>
  );
}

function Punto({ indice }: { indice?: number }) {
  const { fondo, texto } = colorDeComunidad(indice);
  return (
    <span
      aria-hidden
      className="inline-flex size-5 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
      style={{ backgroundColor: fondo, color: texto }}
    >
      {indice === undefined ? '' : indice + 1}
    </span>
  );
}

function ListaComunidades({ comunidades, aisladas }: { comunidades: Comunidad[]; aisladas: number }) {
  return (
    <ol className="flex flex-col gap-2">
      {comunidades.map((comunidad, indice) => (
        <li key={comunidad.ids[0]} className="rounded-lg border border-borde bg-tarjeta px-3 py-2">
          <details>
            <summary className="flex items-center gap-2 text-sm">
              <Punto indice={indice} />
              <span className="min-w-0">
                <span className="block font-semibold">
                  Comunidad {indice + 1} · {plural(comunidad.integrantes, 'persona', 'personas')}
                </span>
                <span className="block text-xs text-suave">{comunidad.ciudades.join(', ')}</span>
              </span>
            </summary>
            <ul className="mt-2 flex flex-col gap-1 pl-7 text-sm">
              {comunidad.ids.map((id, posicion) => (
                <li key={id}>
                  <Link to={`/personas/${id}`} className="hover:underline">
                    {comunidad.miembros[posicion]}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </li>
      ))}
      {aisladas > 0 && (
        <li className="flex items-center gap-2 px-3 py-1 text-sm text-suave">
          <Punto />
          {plural(aisladas, 'persona', 'personas')} sin comunidad
        </li>
      )}
    </ol>
  );
}

function RedPorComunidades() {
  const navegar = useNavigate();
  const grafo = useGrafoRed();
  const comunidades = useComunidades();
  const influyentes = useInfluyentes();

  const { nodos, aristas } = useMemo(() => {
    const personas: NodoRed[] = grafo.data?.nodos.filter((n) => n.tipo === 'Usuario') ?? [];
    const conexiones: AristaRed[] = grafo.data?.aristas.filter((a) => a.tipo === 'CONECTA_CON') ?? [];
    return { nodos: personas, aristas: conexiones };
  }, [grafo.data]);

  const lista = comunidades.data?.datos;
  const indicePorId = useMemo(
    () => new Map(lista?.flatMap((comunidad, indice) => comunidad.ids.map((id) => [id, indice] as const))),
    [lista],
  );
  const destacados = useMemo(() => new Set(influyentes.data?.datos.map((u) => u.id)), [influyentes.data]);

  const colorDe = useCallback((nodo: NodoRed) => colorDeComunidad(indicePorId.get(nodo.id)).fondo, [indicePorId]);
  const marcaDe = useCallback(
    (nodo: NodoRed) => {
      const indice = indicePorId.get(nodo.id);
      if (indice === undefined) return undefined;
      return { texto: String(indice + 1), color: colorDeComunidad(indice).texto };
    },
    [indicePorId],
  );
  const radioDe = useCallback((nodo: NodoRed) => (destacados.has(nodo.id) ? 10 : 7), [destacados]);
  const grupoDe = useCallback((nodo: NodoRed) => indicePorId.get(nodo.id), [indicePorId]);
  const abrirPersona = useCallback((nodo: NodoRed) => void navegar(`/personas/${nodo.id}`), [navegar]);

  const fallo = grafo.error ?? comunidades.error;
  const descripcion = lista
    ? `Red de ${nodos.length} personas y ${aristas.length} conexiones, agrupadas en ${lista.length} comunidades`
    : `Red de ${nodos.length} personas y ${aristas.length} conexiones`;

  return (
    <Seccion
      titulo="Comunidades detectadas"
      ayuda="Louvain agrupa a quienes están más conectados entre sí. Los nodos grandes son los 10 más influyentes."
    >
      {fallo && (
        <MensajeError
          error={fallo}
          alReintentar={() => {
            void grafo.refetch();
            void comunidades.refetch();
          }}
        />
      )}
      {!grafo.data && !fallo && <Cargando texto="Cargando la red…" />}
      {grafo.data && (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
          <GrafoDiferido
            nodos={nodos}
            aristas={aristas}
            descripcion={descripcion}
            colorDe={colorDe}
            marcaDe={marcaDe}
            radioDe={radioDe}
            grupoDe={grupoDe}
            alElegir={abrirPersona}
          />
          {lista && (
            <ListaComunidades
              comunidades={lista}
              aisladas={nodos.length - lista.reduce((total, c) => total + c.integrantes, 0)}
            />
          )}
        </div>
      )}
    </Seccion>
  );
}

function Influyentes() {
  const { data, error, refetch } = useInfluyentes();

  return (
    <Seccion titulo="Usuarios más influyentes" ayuda="PageRank: pesa quién te conecta, no solo cuántos.">
      {error && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {!data && !error && <Cargando />}
      {data && (
        <BarrasRanking
          filas={data.datos.map((u) => ({
            clave: u.id,
            nombre: (
              <Link to={`/personas/${u.id}`} className="hover:underline">
                {u.usuario}
              </Link>
            ),
            detalle: plural(u.conexiones, 'conexión', 'conexiones'),
            valor: u.influencia,
            etiqueta: u.influencia.toFixed(2),
          }))}
        />
      )}
    </Seccion>
  );
}

function Habilidades() {
  const { data, error, refetch } = useHabilidadesDemandadas();

  return (
    <Seccion titulo="Habilidades más demandadas" ayuda="Ofertas abiertas que piden cada habilidad.">
      {error && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {!data && !error && <Cargando />}
      {data && (
        <BarrasRanking
          filas={data.datos.map((h) => ({
            clave: h.habilidad,
            nombre: h.habilidad,
            detalle: `obligatoria en ${h.obligatoria} · ${plural(h.profesionales, 'profesional', 'profesionales')}`,
            valor: h.ofertas,
            etiqueta: String(h.ofertas),
          }))}
        />
      )}
    </Seccion>
  );
}

export function Panel() {
  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
      <RedPorComunidades />
      <div className="grid gap-8 md:grid-cols-2">
        <Influyentes />
        <Habilidades />
      </div>
    </div>
  );
}
