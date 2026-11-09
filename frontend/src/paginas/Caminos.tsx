import { Fragment, useCallback, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useGrafoRed, useRuta, type NodoRed, type Ruta, type TipoDestino } from '../api/analitica';
import { useEmpresas, useOfertasAbiertas } from '../api/oportunidades';
import { usePerfil } from '../api/usuarios';
import { COLOR_POR_TIPO } from '../colores';
import { ComboPersona } from '../componentes/ComboPersona';
import { GrafoDiferido } from '../componentes/GrafoDiferido';
import { Boton, Campo, Cargando, clasesControl, MensajeError, Vacio } from '../componentes/ui';
import { useUsuarioActual } from '../contexto/UsuarioActual';

// Sin flechas ni verbos: el camino recorre las relaciones en cualquier sentido,
// y "Empresa trabaja en Ana" no tendría sentido.
const NOMBRE_RELACION: Record<string, string> = {
  CONECTA_CON: 'conexión',
  TRABAJA_EN: 'empleo',
  PUBLICA: 'publicación',
};

const colorDeTipo = (nodo: NodoRed) => COLOR_POR_TIPO[nodo.tipo];

const RUTA_POR_TIPO = { Usuario: '/personas', Empresa: '/empresas', Oferta: '/ofertas' } as const;

function ResultadoRuta({ ruta }: { ruta: Ruta }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-borde bg-tarjeta p-4">
      <p className="text-sm font-semibold">{ruta.saltos === 1 ? 'A 1 salto' : `A ${ruta.saltos} saltos`}</p>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
        {ruta.nodos.map((nodo, indice) => (
          <Fragment key={nodo.id}>
            {indice > 0 && (
              <li className="text-xs text-suave">— {NOMBRE_RELACION[ruta.relaciones[indice - 1] ?? '']} —</li>
            )}
            <li className="font-semibold">
              <Link to={`${RUTA_POR_TIPO[nodo.tipo]}/${nodo.id}`} className="hover:underline">
                {nodo.nombre}
              </Link>
            </li>
          </Fragment>
        ))}
      </ol>
    </div>
  );
}

function Leyenda() {
  return (
    <ul aria-label="Leyenda" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-suave">
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-full" style={{ backgroundColor: COLOR_POR_TIPO.Usuario }} />
        Persona
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5" style={{ backgroundColor: COLOR_POR_TIPO.Empresa }} />
        Empresa
      </li>
      <li className="flex items-center gap-1.5">
        <span className="size-2.5 rotate-45" style={{ backgroundColor: COLOR_POR_TIPO.Oferta }} />
        Oferta
      </li>
    </ul>
  );
}

function SelectorOrigen({ id, alCambiar }: { id: string | null; alCambiar: (id: string) => void }) {
  const { data: persona } = usePerfil(id);
  const [cambiando, setCambiando] = useState(false);

  if (!id || cambiando) {
    return (
      <ComboPersona
        etiqueta="Buscar persona"
        enfocar={cambiando}
        alElegir={(elegida) => {
          alCambiar(elegida.id);
          setCambiando(false);
        }}
        alCancelar={() => setCambiando(false)}
      />
    );
  }

  return (
    <div className="flex h-[38px] items-center gap-3 text-sm">
      <span className="font-semibold">{persona?.nombre ?? '…'}</span>
      <button
        type="button"
        className="text-xs font-semibold text-suave hover:text-tinta hover:underline"
        onClick={() => setCambiando(true)}
      >
        Cambiar
      </button>
    </div>
  );
}

export function Caminos() {
  const [parametros, setParametros] = useSearchParams();
  const { id: idActual } = useUsuarioActual();

  const origen = parametros.get('origen') ?? idActual;
  const tipo: TipoDestino = parametros.get('tipo') === 'oferta' ? 'oferta' : 'empresa';
  const destino = parametros.get('destino');

  const cambiar = (cambios: Record<string, string | null>) => {
    const nuevos = new URLSearchParams(parametros);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
    }
    setParametros(nuevos, { replace: true });
  };

  const grafo = useGrafoRed();
  const empresas = useEmpresas();
  const ofertas = useOfertasAbiertas();
  const consultaRuta = useRuta(origen, tipo, destino);
  const ruta = consultaRuta.data?.ruta;

  const opciones =
    tipo === 'empresa'
      ? empresas.data?.datos.map((e) => ({ id: e.id, nombre: e.nombre }))
      : ofertas.data?.datos.map((o) => ({ id: o.id, nombre: `${o.titulo} · ${o.empresa.nombre}` }));

  const idsRuta = useMemo(() => ruta?.nodos.map((n) => n.id), [ruta]);

  // Una persona pasa a ser el origen; una empresa u oferta, el destino.
  const elegirEnGrafo = useCallback(
    (nodo: NodoRed) => {
      setParametros(
        (actuales) => {
          const nuevos = new URLSearchParams(actuales);
          if (nodo.tipo === 'Usuario') {
            nuevos.set('origen', nodo.id);
          } else {
            nuevos.set('tipo', nodo.tipo === 'Empresa' ? 'empresa' : 'oferta');
            nuevos.set('destino', nodo.id);
          }
          return nuevos;
        },
        { replace: true },
      );
    },
    [setParametros],
  );

  const descripcion = ruta
    ? `Camino resaltado: ${ruta.nodos.map((n) => n.nombre).join(', ')}`
    : `Red de ${grafo.data?.nodos.length ?? 0} personas, empresas y ofertas`;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Caminos</h1>
        <p className="mt-1 text-sm text-suave">
          El camino más corto entre una persona y una oportunidad, a través de conexiones y empleos.
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-semibold">Desde</span>
          <SelectorOrigen key={origen} id={origen} alCambiar={(id) => cambiar({ origen: id })} />
        </div>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold">Hasta</legend>
          <div className="flex gap-1">
            {(['empresa', 'oferta'] as const).map((opcion) => (
              <Boton
                key={opcion}
                variante={tipo === opcion ? 'primario' : 'secundario'}
                aria-pressed={tipo === opcion}
                onClick={() => cambiar({ tipo: opcion, destino: null })}
              >
                {opcion === 'empresa' ? 'Empresa' : 'Oferta'}
              </Boton>
            ))}
          </div>
        </fieldset>

        <div className="min-w-64 flex-1">
          <Campo etiqueta={tipo === 'empresa' ? 'Empresa de destino' : 'Oferta de destino'}>
            {(control) => (
              <select
                {...control}
                className={clasesControl}
                value={destino ?? ''}
                onChange={(evento) => cambiar({ destino: evento.target.value || null })}
              >
                <option value="">Elige una opción</option>
                {opciones?.map((opcion) => (
                  <option key={opcion.id} value={opcion.id}>
                    {opcion.nombre}
                  </option>
                ))}
              </select>
            )}
          </Campo>
        </div>
      </div>

      {consultaRuta.error && <MensajeError error={consultaRuta.error} />}
      {ruta && <ResultadoRuta ruta={ruta} />}
      {consultaRuta.data && !ruta && (
        <Vacio>No hay camino: esta persona no llega ahí por conexiones ni empleos.</Vacio>
      )}
      {!origen && <Vacio>Elige desde qué persona quieres buscar, o actúa como alguien arriba.</Vacio>}

      <Leyenda />
      {grafo.error && <MensajeError error={grafo.error} alReintentar={() => void grafo.refetch()} />}
      {!grafo.data && !grafo.error && <Cargando texto="Cargando la red…" />}
      {grafo.data && (
        <GrafoDiferido
          nodos={grafo.data.nodos}
          aristas={grafo.data.aristas}
          descripcion={descripcion}
          colorDe={colorDeTipo}
          ruta={idsRuta}
          alElegir={elegirEnGrafo}
          alto={520}
        />
      )}
    </div>
  );
}
