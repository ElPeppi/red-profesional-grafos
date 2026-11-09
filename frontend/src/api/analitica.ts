import { skipToken, useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';

export interface NodoRed {
  id: string;
  nombre: string;
  tipo: 'Usuario' | 'Empresa' | 'Oferta';
}

export interface AristaRed {
  origen: string;
  destino: string;
  tipo: string;
}

export interface Comunidad {
  comunidad: number;
  integrantes: number;
  ciudades: string[];
  ids: string[];
  miembros: string[];
}

export interface Influyente {
  id: string;
  usuario: string;
  titular: string;
  influencia: number;
  conexiones: number;
}

export interface HabilidadDemandada {
  habilidad: string;
  categoria: string;
  ofertas: number;
  obligatoria: number;
  nivelMinimoPromedio: number;
  profesionales: number;
}

export interface Ruta {
  saltos: number;
  relaciones: string[];
  nodos: NodoRed[];
}

export type TipoDestino = 'empresa' | 'oferta';

// Cambiar personas invalida esta raíz: la red dibujada debe verlo también.
export const LLAVE_ANALITICA = 'analitica';

export function useGrafoRed() {
  return useQuery({
    queryKey: [LLAVE_ANALITICA, 'grafo'],
    queryFn: () => pedir<{ nodos: NodoRed[]; aristas: AristaRed[] }>('/analitica/grafo'),
  });
}

export function useComunidades() {
  return useQuery({
    queryKey: [LLAVE_ANALITICA, 'comunidades'],
    queryFn: () => pedir<{ datos: Comunidad[] }>('/analitica/comunidades'),
  });
}

export function useInfluyentes() {
  return useQuery({
    queryKey: [LLAVE_ANALITICA, 'influyentes'],
    queryFn: () => pedir<{ datos: Influyente[] }>('/analitica/influyentes'),
  });
}

export function useHabilidadesDemandadas() {
  return useQuery({
    queryKey: [LLAVE_ANALITICA, 'habilidades'],
    queryFn: () => pedir<{ datos: HabilidadDemandada[] }>('/analitica/habilidades'),
  });
}

export function useRuta(origen: string | null, tipo: TipoDestino, destino: string | null) {
  return useQuery({
    queryKey: [LLAVE_ANALITICA, 'ruta', origen, tipo, destino],
    queryFn:
      origen && destino
        ? () =>
            pedir<{ ruta: Ruta | null }>(
              `/usuarios/${encodeURIComponent(origen)}/ruta-${tipo}/${encodeURIComponent(destino)}`,
            )
        : skipToken,
  });
}
