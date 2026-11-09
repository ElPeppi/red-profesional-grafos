import { useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import { useEscritura } from './escritura';

export interface Similar {
  id: string;
  usuario: string;
  compartidas: string[];
  jaccard: number;
}

export interface ContactoSugerido {
  id: string;
  sugerido: string;
  titular: string;
  puntaje: number;
  contactosEnComun: string[];
  empresasEnComun: string[];
  habilidadesEnComun: string[];
  mismaCiudad: boolean;
}

export interface EmpleoSugerido {
  id: string;
  oferta: string;
  empresa: string;
  modalidad: string;
  puntaje: number;
  cumple: string[];
  faltan: string[];
  faltanObligatorias: string[];
  contactosEnEmpresa: string[];
  mismaCiudad: boolean;
}

export interface Postulacion {
  id: string;
  titulo: string;
  empresa: string;
  estadoOferta: string;
  fecha: string;
  estado: string;
}

const enUrl = encodeURIComponent;

export function useSimilares(id: string) {
  return useQuery({
    queryKey: ['recomendaciones', 'similares', id],
    queryFn: () => pedir<{ datos: Similar[] }>(`/usuarios/${enUrl(id)}/similares`),
  });
}

export function useContactosSugeridos(id: string) {
  return useQuery({
    queryKey: ['recomendaciones', 'contactos', id],
    queryFn: () => pedir<{ datos: ContactoSugerido[] }>(`/usuarios/${enUrl(id)}/recomendaciones/contactos`),
  });
}

export function useEmpleosSugeridos(id: string) {
  return useQuery({
    queryKey: ['recomendaciones', 'empleos', id],
    queryFn: () => pedir<{ datos: EmpleoSugerido[] }>(`/usuarios/${enUrl(id)}/recomendaciones/empleos`),
  });
}

export function usePostulaciones(id: string) {
  return useQuery({
    queryKey: ['postulaciones', id],
    queryFn: () => pedir<{ postulaciones: Postulacion[] }>(`/usuarios/${enUrl(id)}/postulaciones`),
  });
}

export const usePostularse = (usuarioId: string) =>
  useEscritura((ofertaId: string) =>
    pedir(`/ofertas/${enUrl(ofertaId)}/postulaciones`, { metodo: 'POST', cuerpo: { usuarioId } }),
  );
