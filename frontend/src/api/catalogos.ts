import { useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import type { Ciudad } from './usuarios';

export interface Habilidad {
  id: string;
  nombre: string;
  categoria: string;
}

// La API no crea ciudades ni habilidades: los catálogos no cambian mientras la app está abierta.

export function useCiudades() {
  return useQuery({
    queryKey: ['catalogo', 'ciudades'],
    queryFn: () => pedir<{ datos: Ciudad[] }>('/ciudades'),
    staleTime: Infinity,
  });
}

export function useHabilidades() {
  return useQuery({
    queryKey: ['catalogo', 'habilidades'],
    queryFn: () => pedir<{ datos: Habilidad[] }>('/habilidades'),
    staleTime: Infinity,
  });
}
