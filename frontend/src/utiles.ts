import { useEffect, useRef, useState } from 'react';

/** Devuelve el valor tras un rato sin cambios, para no consultar en cada tecla. */
export function useDemorado<T>(valor: T, milisegundos = 250): T {
  const [demorado, setDemorado] = useState(valor);

  useEffect(() => {
    const temporizador = setTimeout(() => setDemorado(valor), milisegundos);
    return () => clearTimeout(temporizador);
  }, [valor, milisegundos]);

  return demorado;
}

/**
 * Ignora una tarea si la anterior no ha terminado. disabled no basta: React Query avisa
 * que está ocupada en el siguiente tick, y en ese hueco cabe el segundo clic de un doble
 * clic. La primera crea el registro y la segunda devuelve un 409 que parece un fallo.
 * El error no se pierde: queda en la mutación, que es de donde lo lee la pantalla.
 */
export function useSinRepetir() {
  const ocupado = useRef(false);

  return async (tarea: () => Promise<unknown>) => {
    if (ocupado.current) return;
    ocupado.current = true;
    try {
      await tarea();
    } catch {
      // Ya está en mutation.error.
    } finally {
      ocupado.current = false;
    }
  };
}

/**
 * Para botones que escriben: no repite mientras corre, y guarda el error de esta acción
 * en particular. El error de una mutación compartida se quedaría pegado aunque otra acción
 * de la misma pantalla saliera bien.
 */
export function useAccion() {
  const sinRepetir = useSinRepetir();
  const [error, setError] = useState<unknown>(null);
  const [ocupado, setOcupado] = useState(false);

  const ejecutar = (tarea: () => Promise<unknown>) =>
    sinRepetir(async () => {
      setError(null);
      setOcupado(true);
      try {
        await tarea();
      } catch (fallo) {
        setError(fallo);
      } finally {
        setOcupado(false);
      }
    });

  return { ejecutar, error, ocupado };
}

export function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/);
  return palabras
    .slice(0, 2)
    .map((p) => Array.from(p)[0] ?? '')
    .join('')
    .toUpperCase();
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/**
 * Las fechas llegan como 'AAAA-MM-DD'. new Date() las leería como medianoche UTC,
 * que en Colombia todavía es el día anterior: 2022-02-01 saldría como enero.
 */
export function mesYAnio(fecha: string): string {
  const [anio, mes] = fecha.split('-');
  return `${MESES[Number(mes) - 1]} ${anio}`;
}

/** '2026-11-07' → '7 nov 2026', sin pasar por Date por la misma razón que mesYAnio. */
export function diaMesAnio(fecha: string): string {
  const [anio, mes, dia] = fecha.split('-');
  return `${Number(dia)} ${MESES[Number(mes) - 1]} ${anio}`;
}

export const experiencia = (anios: number) => (anios === 1 ? '1 año' : `${anios} años`);

export const plural = (cantidad: number, singular: string, varias: string) =>
  `${cantidad} ${cantidad === 1 ? singular : varias}`;

/** Solo lo que cambió: un PATCH con todo pisaría lo que otro haya editado mientras tanto. */
export function soloCambios<T extends Record<string, unknown>>(original: T, valores: T): Partial<T> {
  return Object.fromEntries(Object.entries(valores).filter(([campo, valor]) => valor !== original[campo])) as Partial<T>;
}

/** ['A', 'B', 'C'] → 'A, B y C' */
export function listaLegible(elementos: string[]): string {
  if (elementos.length <= 1) return elementos.join('');
  return `${elementos.slice(0, -1).join(', ')} y ${elementos.at(-1)}`;
}
