import { fileURLToPath } from 'node:url';

/** Escala pedida por línea de comandos: cantidad de personas. */
export function leerEscala(argumento: string | undefined): number {
  const cantidad = Number(argumento);
  if (!Number.isSafeInteger(cantidad) || cantidad < 100) {
    throw new Error('Indica cuántas personas, al menos 100. Ej.: npm run generar -- 10000');
  }
  return cantidad;
}

export const carpetaDatos = (escala: number) => fileURLToPath(new URL(`../datos/${escala}/`, import.meta.url));
export const carpetaResultados = () => fileURLToPath(new URL('../resultados/', import.meta.url));
export const archivoDelPaquete = (ruta: string) => fileURLToPath(new URL(`../${ruta}`, import.meta.url));

function celda(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  const texto = String(valor);
  return /[",\n\r]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/** CSV con encabezado. Un vacío es nulo para las dos bases. */
export function aCsv<T extends object>(filas: T[], columnas: (keyof T & string)[]): string {
  const lineas = [columnas.join(',')];
  for (const fila of filas) lineas.push(columnas.map((c) => celda(fila[c])).join(','));
  return `${lineas.join('\n')}\n`;
}
