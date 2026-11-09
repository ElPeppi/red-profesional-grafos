import { useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import type { Pagina } from './usuarios';

export interface EmpresaResumen {
  id: string;
  nombre: string;
}

export interface OfertaResumen {
  id: string;
  titulo: string;
  empresa: EmpresaResumen;
}

export interface ProyectoResumen {
  id: string;
  nombre: string;
  estado: string;
  empresa: EmpresaResumen | null;
}

// 100 es el máximo de la API, y sobra para un selector: la semilla trae 8 empresas, 15 ofertas y 12 proyectos.
export function useEmpresas() {
  return useQuery({
    queryKey: ['empresas', 'selector'],
    queryFn: () => pedir<Pagina<EmpresaResumen>>('/empresas?limite=100'),
  });
}

export function useOfertasAbiertas() {
  return useQuery({
    queryKey: ['ofertas', 'selector'],
    queryFn: () => pedir<Pagina<OfertaResumen>>('/ofertas?estado=abierta&limite=100'),
  });
}

export function useProyectos() {
  return useQuery({
    queryKey: ['proyectos', 'selector'],
    queryFn: () => pedir<Pagina<ProyectoResumen>>('/proyectos?limite=100'),
  });
}
