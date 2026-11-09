import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D, { type ForceGraphMethods, type LinkObject, type NodeObject } from 'react-force-graph-2d';
import type { AristaRed, NodoRed } from '../api/analitica';
import { BORDE, BORDE_TENUE, TARJETA, TINTA } from '../colores';

type Nodo = NodeObject<NodoRed>;
type Enlace = LinkObject<NodoRed, { tipo: string }>;

export interface PropsGrafo {
  nodos: NodoRed[];
  aristas: AristaRed[];
  /** El canvas no tiene texto: esto es lo que oye un lector de pantalla. */
  descripcion: string;
  colorDe: (nodo: NodoRed) => string;
  marcaDe?: (nodo: NodoRed) => { texto: string; color: string } | undefined;
  radioDe?: (nodo: NodoRed) => number;
  /** Quienes comparten grupo se dibujan juntos. Solo acomoda el dibujo: no cambia ningún dato. */
  grupoDe?: (nodo: NodoRed) => number | undefined;
  /** Ids en orden de recorrido: resalta ese camino y atenúa lo demás. */
  ruta?: string[] | undefined;
  alElegir?: (nodo: NodoRed) => void;
  alto?: number;
}

const RADIO = 5;
const FUENTE = "'Segoe UI', system-ui, sans-serif";

const REPULSION = -110;
const GRAVEDAD = 0.04;
// Quien no tiene aristas solo siente la repulsión de todos los demás: con la gravedad común quedaba
// tan lejos que el zoom encogía el resto a puntos de 2 o 3 píxeles. Con esta queda en el borde.
const GRAVEDAD_AISLADO = 0.12;

const parDe = (a: unknown, b: unknown) => [a, b].sort().join('|');

/** Atrae todo al centro: sin esto, quien no tiene conexiones se aleja y achica el dibujo. */
function fuerzaDeGravedad(conAristas: Set<unknown>) {
  let nodos: Nodo[] = [];
  const fuerza = (alpha: number) => {
    for (const nodo of nodos) {
      const gravedad = conAristas.has(nodo.id) ? GRAVEDAD : GRAVEDAD_AISLADO;
      nodo.vx = (nodo.vx ?? 0) - (nodo.x ?? 0) * gravedad * alpha;
      nodo.vy = (nodo.vy ?? 0) - (nodo.y ?? 0) * gravedad * alpha;
    }
  };
  fuerza.initialize = (lista: Nodo[]) => {
    nodos = lista;
  };
  return fuerza;
}

/** d3 cambia source y target por el objeto del nodo cuando arranca la simulación. */
const idDe = (extremo: Enlace['source']) => (typeof extremo === 'object' ? extremo.id : extremo);

function trazarForma(ctx: CanvasRenderingContext2D, tipo: NodoRed['tipo'], x: number, y: number, r: number) {
  ctx.beginPath();
  if (tipo === 'Empresa') {
    ctx.rect(x - r, y - r, r * 2, r * 2);
  } else if (tipo === 'Oferta') {
    const d = r * 1.3;
    ctx.moveTo(x, y - d);
    ctx.lineTo(x + d, y);
    ctx.lineTo(x, y + d);
    ctx.lineTo(x - d, y);
    ctx.closePath();
  } else {
    ctx.arc(x, y, r, 0, 2 * Math.PI);
  }
}

function escribirNombre(ctx: CanvasRenderingContext2D, nombre: string, x: number, y: number, escala: number, fuerte: boolean) {
  ctx.font = `${fuerte ? 600 : 400} ${12 / escala}px ${FUENTE}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  // El halo del color del fondo mantiene el texto legible cuando cruza una arista.
  ctx.lineWidth = 3 / escala;
  ctx.strokeStyle = TARJETA;
  ctx.strokeText(nombre, x, y);
  ctx.fillStyle = TINTA;
  ctx.fillText(nombre, x, y);
}

export function GrafoRed(props: PropsGrafo) {
  const { nodos, aristas, descripcion, colorDe, marcaDe, radioDe, grupoDe, ruta, alElegir, alto = 460 } = props;

  const grafo = useRef<ForceGraphMethods<Nodo, Enlace>>(undefined);
  const marco = useRef<HTMLDivElement>(null);
  const [ancho, setAncho] = useState(0);
  const [listo, setListo] = useState(false);
  const montado = ancho > 0;
  const [encima, setEncima] = useState<string | null>(null);

  // La librería escribe posiciones en estos objetos: van copias, no los de React Query.
  // El filtro evita que se caiga: d3 lanza un error si una arista apunta a un nodo que no está.
  const datos = useMemo(() => {
    const conocidos = new Set(nodos.map((n) => n.id));
    return {
      nodes: nodos.map((n): Nodo => ({ ...n })),
      links: aristas
        .filter((a) => conocidos.has(a.origen) && conocidos.has(a.destino))
        .map((a): Enlace => ({ source: a.origen, target: a.destino, tipo: a.tipo })),
    };
  }, [nodos, aristas]);

  const paradas = useMemo(() => new Set(ruta), [ruta]);
  const tramos = useMemo(() => new Set(ruta?.slice(1).map((id, i) => parDe(ruta[i], id))), [ruta]);
  const hayRuta = paradas.size > 0;

  useEffect(() => {
    const elemento = marco.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => setAncho(entrada?.contentRect.width ?? 0));
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  useEffect(() => {
    const motor = grafo.current;
    if (!montado || !motor) return;

    const mismoGrupo = (enlace: Enlace) => {
      if (!grupoDe) return true;
      const [a, b] = [enlace.source, enlace.target] as Nodo[];
      const grupo = a && grupoDe(a);
      return grupo !== undefined && b !== undefined && grupo === grupoDe(b);
    };

    motor.d3Force('charge')?.strength(REPULSION);
    motor.d3Force('link')?.strength((enlace: Enlace) => (mismoGrupo(enlace) ? 0.7 : 0.03));
    const conAristas = new Set(datos.links.flatMap((enlace) => [idDe(enlace.source), idDe(enlace.target)]));
    motor.d3Force('gravedad', fuerzaDeGravedad(conAristas));
    motor.d3ReheatSimulation();
  }, [montado, datos, grupoDe]);

  const ajustarVista = useCallback(() => {
    grafo.current?.zoomToFit(500, 48, hayRuta ? (nodo) => paradas.has(nodo.id as string) : undefined);
  }, [hayRuta, paradas]);

  useEffect(() => {
    if (listo) ajustarVista();
  }, [listo, ancho, ajustarVista]);

  const dibujarNodo = useCallback(
    (nodo: Nodo, ctx: CanvasRenderingContext2D, escala: number) => {
      const { x = 0, y = 0 } = nodo;
      const r = radioDe?.(nodo) ?? RADIO;
      const enRuta = paradas.has(nodo.id);

      ctx.globalAlpha = hayRuta && !enRuta ? 0.18 : 1;
      trazarForma(ctx, nodo.tipo, x, y, r);
      ctx.fillStyle = colorDe(nodo);
      ctx.fill();
      ctx.lineWidth = (enRuta ? 2.5 : 1.5) / escala;
      ctx.strokeStyle = enRuta ? TINTA : TARJETA;
      ctx.stroke();

      const marca = marcaDe?.(nodo);
      if (marca) {
        ctx.font = `600 ${r * 1.15}px ${FUENTE}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = marca.color;
        ctx.fillText(marca.texto, x, y + r * 0.08);
      }

      ctx.globalAlpha = 1;
      if (enRuta || nodo.id === encima || escala > 3) {
        escribirNombre(ctx, nodo.nombre, x, y + r + 3 / escala, escala, enRuta || nodo.id === encima);
      }
    },
    [colorDe, marcaDe, radioDe, paradas, hayRuta, encima],
  );

  const pintarAreaDeClic = useCallback(
    (nodo: Nodo, color: string, ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(nodo.x ?? 0, nodo.y ?? 0, (radioDe?.(nodo) ?? RADIO) + 2, 0, 2 * Math.PI);
      ctx.fill();
    },
    [radioDe],
  );

  const enTramo = useCallback(
    (enlace: Enlace) => tramos.has(parDe(idDe(enlace.source), idDe(enlace.target))),
    [tramos],
  );

  const colorDeEnlace = useCallback(
    (enlace: Enlace) => {
      if (enTramo(enlace)) return TINTA;
      return hayRuta ? BORDE_TENUE : BORDE;
    },
    [enTramo, hayRuta],
  );

  return (
    <div
      ref={marco}
      role="img"
      aria-label={descripcion}
      data-listo={listo}
      className="overflow-hidden rounded-xl border border-borde bg-tarjeta"
      style={{ height: alto, cursor: encima ? 'pointer' : undefined }}
    >
      {montado && (
        <ForceGraph2D<NodoRed, { tipo: string }>
          ref={grafo}
          graphData={datos}
          width={ancho}
          height={alto}
          backgroundColor={TARJETA}
          nodeCanvasObject={dibujarNodo}
          nodePointerAreaPaint={pintarAreaDeClic}
          linkColor={colorDeEnlace}
          linkWidth={(enlace) => (enTramo(enlace) ? 2.5 : 1)}
          cooldownTicks={120}
          enableNodeDrag={false}
          onEngineStop={() => {
            setListo(true);
            ajustarVista();
          }}
          onNodeHover={(nodo) => setEncima(nodo?.id ?? null)}
          onNodeClick={(nodo) => alElegir?.(nodo)}
        />
      )}
    </div>
  );
}
