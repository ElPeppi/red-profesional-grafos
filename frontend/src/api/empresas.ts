import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import { useEscritura } from './escritura';
import type { Ciudad, Pagina } from './usuarios';

export interface Empresa {
  id: string;
  nombre: string;
  sector: string;
  ciudad: Ciudad;
}

export interface PerfilEmpresa extends Empresa {
  totalEmpleados: number;
  ofertas: { id: string; titulo: string; estado: string; publicadaEn: string }[];
  proyectos: { id: string; nombre: string; estado: string }[];
}

export interface DatosEmpresa {
  nombre: string;
  sector: string;
  ciudadId: string;
}

const enUrl = encodeURIComponent;

export function useListaEmpresas(pagina: number, limite: number) {
  return useQuery({
    queryKey: ['empresas', 'lista', pagina, limite],
    queryFn: () => pedir<Pagina<Empresa>>(`/empresas?pagina=${pagina}&limite=${limite}`),
    placeholderData: keepPreviousData,
  });
}

export function useEmpresa(id: string) {
  return useQuery({
    queryKey: ['empresas', 'detalle', id],
    queryFn: () => pedir<PerfilEmpresa>(`/empresas/${enUrl(id)}`),
  });
}

export const useCrearEmpresa = () =>
  useEscritura((datos: DatosEmpresa) => pedir<Empresa>('/empresas', { metodo: 'POST', cuerpo: datos }));

export const useActualizarEmpresa = (id: string) =>
  useEscritura((cambios: Partial<DatosEmpresa>) => pedir(`/empresas/${enUrl(id)}`, { metodo: 'PATCH', cuerpo: cambios }));

export const useEliminarEmpresa = () =>
  useEscritura((id: string) => pedir(`/empresas/${enUrl(id)}`, { metodo: 'DELETE' }), { esperar: false });
