import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { carpetaResultados } from './archivos.js';
import type { Estadisticas } from './estadistica.js';

// Gráficas y tablas a partir de resultados/consultas-<escala>.json. Se regeneran con:
//   npm run graficas
// SVG para la web y PNG al doble de resolución para el documento (Word y Google Docs no leen SVG).

const ESCALAS = [1_000, 10_000, 100_000];
const GRANDE = 100_000;

interface Medicion {
  estado: string;
  tiempos?: Estadisticas;
}
interface ResultadoConsulta {
  nombre: string;
  descripcion: string;
  neo4j: Medicion;
  postgres: Medicion;
}

const ETIQUETAS: Record<string, string> = {
  'ida-y-vuelta': 'Ida y vuelta (sin trabajo)',
  'buscar-por-id': 'Buscar por id',
  'listar-pagina': 'Página de 20, en posición al azar',
  'habilidades-demandadas': 'Habilidades más demandadas',
  'contactos-en-comun': 'Contactos en común',
  'amigos-de-amigos': 'Amigos de amigos',
  'alcance-1': 'Alcance a 1 salto',
  'alcance-2': 'Alcance a 2 saltos',
  'alcance-3': 'Alcance a 3 saltos',
  'alcance-4': 'Alcance a 4 saltos',
  camino: 'Camino más corto',
  'camino-procedimiento': 'Camino más corto (procedimiento)',
  candidatos: 'Candidatos para una oferta',
  'insertar-conexiones': 'Insertar 1.000 conexiones',
};

// Paleta validada con el validador de dataviz: tres primeros colores categóricos, en orden fijo.
const COLOR = { neo4j: '#2a78d6', postgres: '#eb6834', procedimiento: '#1baf7a' };
const TINTA = '#1d2129';
const SUAVE = '#5c6170';
const REJILLA = '#e6e2d8';
const FONDO = '#ffffff';
const FUENTE = "font-family=\"'Segoe UI', system-ui, sans-serif\"";

const numero = (x: number, decimales = 1) => x.toLocaleString('es-CO', { maximumFractionDigits: decimales });
const ms = (x: number) => `${numero(x, x < 10 ? 2 : x < 100 ? 1 : 0)} ms`;
const escalaTexto = (e: number) => `${numero(e, 0)} personas`;
const escapar = (texto: string) => texto.replaceAll('&', '&amp;').replaceAll('<', '&lt;');

async function leer(escala: number): Promise<Map<string, ResultadoConsulta>> {
  const datos = JSON.parse(await readFile(join(carpetaResultados(), `consultas-${escala}.json`), 'utf8'));
  return new Map((datos.consultas as ResultadoConsulta[]).map((c) => [c.nombre, c]));
}

const mediana = (m: Medicion | undefined) => m?.tiempos?.mediana;

// ---------- Piezas de SVG ----------

const texto = (x: number, y: number, contenido: string, opciones = '') =>
  `<text x="${x}" y="${y}" ${FUENTE} ${opciones}>${escapar(contenido)}</text>`;

function lienzo(ancho: number, alto: number, titulo: string, subtitulo: string, cuerpo: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ancho}" height="${alto}" viewBox="0 0 ${ancho} ${alto}" role="img" aria-label="${escapar(titulo)}">
<rect width="${ancho}" height="${alto}" fill="${FONDO}"/>
${texto(24, 32, titulo, `font-size="17" font-weight="600" fill="${TINTA}"`)}
${texto(24, 54, subtitulo, `font-size="12.5" fill="${SUAVE}"`)}
${cuerpo}
</svg>`;
}

function leyenda(x: number, y: number, series: { nombre: string; color: string }[]) {
  let desplazamiento = 0;
  return series
    .map(({ nombre, color }) => {
      const pieza = `<circle cx="${x + desplazamiento + 5}" cy="${y - 4}" r="5" fill="${color}"/>${texto(x + desplazamiento + 15, y, nombre, `font-size="12.5" fill="${TINTA}"`)}`;
      desplazamiento += 30 + nombre.length * 7;
      return pieza;
    })
    .join('\n');
}

/** Eje logarítmico: el tiempo va de décimas de milisegundo a cientos; en escala lineal casi todo se vería en cero. */
function ejeLog(minimo: number, maximo: number, alto: number) {
  const desde = Math.floor(Math.log10(minimo));
  const hasta = Math.ceil(Math.log10(maximo));
  const y = (valor: number) => alto - ((Math.log10(valor) - desde) / (hasta - desde)) * alto;
  const marcas = Array.from({ length: hasta - desde + 1 }, (_, i) => 10 ** (desde + i));
  return { y, marcas };
}

interface Serie {
  nombre: string;
  color: string;
  puntos: (number | undefined)[];
}

/** Líneas con marcadores sobre un eje x de categorías y un eje y logarítmico en ms. */
function grafica(
  titulo: string,
  subtitulo: string,
  categorias: string[],
  tituloX: string,
  series: Serie[],
): string {
  const ancho = 760;
  const alto = 440;
  const margen = { izquierda: 76, derecha: 190, arriba: 96, abajo: 64 };
  const anchoArea = ancho - margen.izquierda - margen.derecha;
  const altoArea = alto - margen.arriba - margen.abajo;
  const valores = series.flatMap((s) => s.puntos.filter((v): v is number => v !== undefined));
  const { y, marcas } = ejeLog(Math.min(...valores), Math.max(...valores), altoArea);
  const x = (i: number) => (categorias.length === 1 ? anchoArea / 2 : (i / (categorias.length - 1)) * anchoArea);

  const rejilla = marcas
    .map(
      (m) =>
        `<line x1="0" x2="${anchoArea}" y1="${y(m)}" y2="${y(m)}" stroke="${REJILLA}" stroke-width="1"/>` +
        texto(-10, y(m) + 4, m < 1 ? numero(m, 1) : numero(m, 0), `font-size="12" fill="${SUAVE}" text-anchor="end"`),
    )
    .join('\n');
  const ejeX = categorias
    .map((c, i) => texto(x(i), altoArea + 24, c, `font-size="12.5" fill="${TINTA}" text-anchor="middle"`))
    .join('\n');

  // Etiqueta directa al final de cada línea, separadas si quedan encima una de otra.
  const finales = series
    .map((s) => {
      const ultimo = s.puntos.length - 1;
      const valor = s.puntos[ultimo];
      return valor === undefined ? null : { s, valor, yFinal: y(valor) };
    })
    .filter((f): f is { s: Serie; valor: number; yFinal: number } => f !== null)
    .sort((a, b) => a.yFinal - b.yFinal);
  for (let i = 1; i < finales.length; i++) {
    const anterior = finales[i - 1] as { yFinal: number };
    const actual = finales[i] as { yFinal: number };
    if (actual.yFinal - anterior.yFinal < 30) actual.yFinal = anterior.yFinal + 30;
  }

  const lineas = series
    .map((s) => {
      const puntos = s.puntos.map((v, i) => (v === undefined ? null : [x(i), y(v)] as const)).filter((p) => p !== null);
      const trazo = puntos.map(([px, py], i) => `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`).join(' ');
      const marcadores = puntos
        .map(([px, py]) => `<circle cx="${px}" cy="${py}" r="4.5" fill="${s.color}" stroke="${FONDO}" stroke-width="2"/>`)
        .join('');
      return `<path d="${trazo}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>${marcadores}`;
    })
    .join('\n');

  const etiquetas = finales
    .map(({ s, valor, yFinal }) => {
      const xFinal = x(s.puntos.length - 1) + 14;
      return (
        texto(xFinal, yFinal - 2, s.nombre, `font-size="12" fill="${SUAVE}"`) +
        texto(xFinal, yFinal + 13, ms(valor), `font-size="13" font-weight="600" fill="${TINTA}"`)
      );
    })
    .join('\n');

  const cuerpo = `${leyenda(24, 80, series)}
<g transform="translate(${margen.izquierda},${margen.arriba})">
${rejilla}
<line x1="0" x2="${anchoArea}" y1="${altoArea}" y2="${altoArea}" stroke="${SUAVE}" stroke-width="1"/>
${ejeX}
${texto(anchoArea / 2, altoArea + 48, tituloX, `font-size="12" fill="${SUAVE}" text-anchor="middle"`)}
${texto(-52, altoArea / 2, 'Mediana en ms (escala logarítmica)', `font-size="12" fill="${SUAVE}" text-anchor="middle" transform="rotate(-90 -52 ${altoArea / 2})"`)}
${lineas}
${etiquetas}
</g>`;
  return lienzo(ancho, alto, titulo, subtitulo, cuerpo);
}

/** Barras divergentes desde 1×: a la derecha gana Neo4j, a la izquierda PostgreSQL. */
function graficaVentaja(filas: { etiqueta: string; razon: number }[], escala: number): string {
  const ancho = 820;
  const altoFila = 34;
  const margen = { izquierda: 270, derecha: 120, arriba: 110, abajo: 56 };
  const anchoArea = ancho - margen.izquierda - margen.derecha;
  const alto = margen.arriba + filas.length * altoFila + margen.abajo;
  // Décadas a cada lado según los datos: PostgreSQL gana por poco y Neo4j por mucho, así que el
  // lado derecho necesita más espacio. Repartirlo por igual cortaba las barras más largas.
  const decadasIzquierda = Math.max(1, Math.ceil(Math.max(...filas.map((f) => -Math.log10(f.razon)))));
  const decadasDerecha = Math.max(1, Math.ceil(Math.max(...filas.map((f) => Math.log10(f.razon)))));
  const unidad = anchoArea / (decadasIzquierda + decadasDerecha);
  const centro = decadasIzquierda * unidad;
  const xDe = (razon: number) => centro + Math.log10(razon) * unidad;

  const marcas = Array.from({ length: decadasIzquierda + decadasDerecha + 1 }, (_, i) => 10 ** (i - decadasIzquierda));
  const rejilla = marcas
    .map((m) => {
      const etiqueta = m < 1 ? `${numero(1 / m, 0)}× ←` : m === 1 ? 'igual' : `→ ${numero(m, 0)}×`;
      return (
        `<line x1="${xDe(m)}" x2="${xDe(m)}" y1="-8" y2="${filas.length * altoFila}" stroke="${m === 1 ? SUAVE : REJILLA}" stroke-width="1"/>` +
        texto(xDe(m), filas.length * altoFila + 20, etiqueta, `font-size="12" fill="${SUAVE}" text-anchor="middle"`)
      );
    })
    .join('\n');

  const barras = filas
    .map((f, i) => {
      const yFila = i * altoFila + 8;
      const gana = f.razon >= 1 ? 'neo4j' : 'postgres';
      const extremo = xDe(f.razon);
      const desde = Math.min(centro, extremo);
      const largo = Math.max(2, Math.abs(extremo - centro));
      // Punta redondeada de 4 px solo en el extremo de dato; recta contra la línea de 1×.
      const r = Math.min(4, largo / 2);
      const forma =
        gana === 'neo4j'
          ? `M${desde},${yFila} h${largo - r} q${r},0 ${r},${r} v${18 - 2 * r} q0,${r} -${r},${r} h-${largo - r} z`
          : `M${desde + largo},${yFila} h-${largo - r} q-${r},0 -${r},${r} v${18 - 2 * r} q0,${r} ${r},${r} h${largo - r} z`;
      // Un decimal fijo bajo 10×: "1,0×" dice "casi igual"; "1×" parecería exacto.
      const veces = f.razon >= 1 ? f.razon : 1 / f.razon;
      const valor = `${veces.toLocaleString('es-CO', { minimumFractionDigits: veces < 10 ? 1 : 0, maximumFractionDigits: veces < 10 ? 1 : 0 })}×`;
      const xValor = gana === 'neo4j' ? extremo + 8 : extremo - 8;
      return (
        texto(-16, yFila + 14, f.etiqueta, `font-size="12.5" fill="${TINTA}" text-anchor="end"`) +
        `<path d="${forma}" fill="${COLOR[gana]}"/>` +
        texto(xValor, yFila + 14, valor, `font-size="12.5" font-weight="600" fill="${TINTA}" text-anchor="${gana === 'neo4j' ? 'start' : 'end'}"`)
      );
    })
    .join('\n');

  const cuerpo = `${leyenda(24, 82, [
    { nombre: 'Neo4j más rápido', color: COLOR.neo4j },
    { nombre: 'PostgreSQL más rápido', color: COLOR.postgres },
  ])}
<g transform="translate(${margen.izquierda},${margen.arriba})">
${rejilla}
${barras}
</g>`;
  return lienzo(
    ancho,
    alto,
    `¿Cuántas veces más rápido? ${escalaTexto(escala)}`,
    'Mediana de PostgreSQL ÷ mediana de Neo4j, en escala logarítmica. Mismos datos y mismas entradas.',
    cuerpo,
  );
}

// ---------- Tablas ----------

function tabla(resultados: Map<string, ResultadoConsulta>) {
  const celda = (m: Medicion) => (m.tiempos ? `${numero(m.tiempos.mediana, 2)} (p95 ${numero(m.tiempos.p95, 2)})` : m.estado);
  const filas = [...resultados.values()].map((c) => {
    const n = mediana(c.neo4j);
    const p = mediana(c.postgres);
    const razon = n && p ? (p >= n ? `Neo4j ${numero(p / n, 1)}×` : `PostgreSQL ${numero(n / p, 1)}×`) : '—';
    return `| ${ETIQUETAS[c.nombre] ?? c.nombre} | ${celda(c.neo4j)} | ${celda(c.postgres)} | ${razon} |`;
  });
  return ['| Consulta | Neo4j, ms | PostgreSQL, ms | Más rápido |', '|---|---|---|---|', ...filas].join('\n');
}

// ---------- Corrida ----------

const porEscala = new Map<number, Map<string, ResultadoConsulta>>();
for (const escala of ESCALAS) porEscala.set(escala, await leer(escala));
const grande = porEscala.get(GRANDE) as Map<string, ResultadoConsulta>;

const graficas: Record<string, string> = {
  profundidad: grafica(
    `Alcance según profundidad, ${escalaTexto(GRANDE)}`,
    'Personas distintas a k saltos o menos. Neo4j poda lo ya visitado; la CTE recursiva no puede.',
    ['1 salto', '2 saltos', '3 saltos', '4 saltos'],
    'Profundidad',
    [
      { nombre: 'Neo4j', color: COLOR.neo4j, puntos: [1, 2, 3, 4].map((k) => mediana(grande.get(`alcance-${k}`)?.neo4j)) },
      { nombre: 'PostgreSQL', color: COLOR.postgres, puntos: [1, 2, 3, 4].map((k) => mediana(grande.get(`alcance-${k}`)?.postgres)) },
    ],
  ),
  'escala-camino': grafica(
    'Camino más corto según tamaño de la red',
    'Saltos entre dos personas, hasta 6. Neo4j busca desde ambos extremos y se detiene al encontrarse.',
    ESCALAS.map((e) => numero(e, 0)),
    'Personas en la red',
    [
      { nombre: 'Neo4j', color: COLOR.neo4j, puntos: ESCALAS.map((e) => mediana(porEscala.get(e)?.get('camino')?.neo4j)) },
      { nombre: 'PostgreSQL, CTE', color: COLOR.postgres, puntos: ESCALAS.map((e) => mediana(porEscala.get(e)?.get('camino')?.postgres)) },
      {
        nombre: 'PostgreSQL, procedimiento',
        color: COLOR.procedimiento,
        puntos: ESCALAS.map((e) => mediana(porEscala.get(e)?.get('camino-procedimiento')?.postgres)),
      },
    ],
  ),
  'escala-alcance-4': grafica(
    'Alcance a 4 saltos según tamaño de la red',
    'Mientras más grande la red, más pesa recorrer sin memoria de lo visitado.',
    ESCALAS.map((e) => numero(e, 0)),
    'Personas en la red',
    [
      { nombre: 'Neo4j', color: COLOR.neo4j, puntos: ESCALAS.map((e) => mediana(porEscala.get(e)?.get('alcance-4')?.neo4j)) },
      { nombre: 'PostgreSQL', color: COLOR.postgres, puntos: ESCALAS.map((e) => mediana(porEscala.get(e)?.get('alcance-4')?.postgres)) },
    ],
  ),
  ventaja: graficaVentaja(
    [...grande.values()]
      .flatMap((c) => {
        const n = mediana(c.neo4j);
        const p = mediana(c.postgres);
        if (c.nombre === 'camino-procedimiento') {
          const neoCamino = mediana(grande.get('camino')?.neo4j);
          return p && neoCamino ? [{ etiqueta: ETIQUETAS[c.nombre] ?? c.nombre, razon: p / neoCamino }] : [];
        }
        return n && p ? [{ etiqueta: ETIQUETAS[c.nombre] ?? c.nombre, razon: p / n }] : [];
      })
      .sort((a, b) => a.razon - b.razon),
    GRANDE,
  ),
};

const carpeta = join(carpetaResultados(), 'graficas');
await mkdir(carpeta, { recursive: true });
const navegador = await chromium.launch({ channel: 'chrome' });
const pagina = await navegador.newPage({ deviceScaleFactor: 2 });
for (const [nombre, svg] of Object.entries(graficas)) {
  await writeFile(join(carpeta, `${nombre}.svg`), svg, 'utf8');
  await pagina.setContent(`<html><body style="margin:0;background:#fff">${svg}</body></html>`);
  await pagina.locator('svg').screenshot({ path: join(carpeta, `${nombre}.png`) });
}
await navegador.close();

const tablas = ESCALAS.map((e) => `## ${escalaTexto(e)}\n\nMediana y p95 de 30 mediciones, en ms.\n\n${tabla(porEscala.get(e) as Map<string, ResultadoConsulta>)}`);
await writeFile(join(carpetaResultados(), 'tablas.md'), `# Tablas del benchmark\n\nGeneradas por \`npm run graficas\`.\n\n${tablas.join('\n\n')}\n`, 'utf8');
console.log(`Gráficas y tablas en ${carpetaResultados()}`);
