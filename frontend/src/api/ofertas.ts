import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import { useEscritura } from './escritura';
import type { Pagina } from './usuarios';

export interface Oferta {
  id: string;
  titulo: string;
  nivel: string;
  modalidad: string;
  estado: string;
  publicadaEn: string;
  empresa: { id: string; nombre: string };
  ciudad: { id: string; nombre: string };
}

export interface Requisito {
  id: string;
  nombre: string;
  categoria: string;
  nivelMinimo: number;
  obligatoria: boolean;
}

export interface DetalleOferta extends Oferta {
  totalPostulaciones: number;
  habilidades: Requisito[];
}

export interface Postulante {
  id: string;
  nombre: string;
  titular: string;
  fecha: string;
  estado: string;
}

export interface Candidato {
  id: string;
  candidato: string;
  puntaje: number;
  cumple: string[];
  faltan: string[];
  faltanObligatorias: string[];
  contactosEnEmpresa: string[];
  mismaCiudad: boolean;
}

export interface DatosOferta {
  titulo: string;
  nivel: string;
  modalidad: string;
  ciudadId: string;
  empresaId: string;
  estado: string;
}

export const NIVELES_OFERTA = ['junior', 'semi-senior', 'senior'];
export const MODALIDADES = ['presencial', 'híbrido', 'remoto'];
export const ESTADOS_POSTULACION = ['enviada', 'en revisión', 'entrevista', 'rechazada', 'aceptada'];

const enUrl = encodeURIComponent;

export function useListaOfertas(estado: string | null, pagina: number, limite: number) {
  const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(limite) });
  if (estado) parametros.set('estado', estado);
  return useQuery({
    queryKey: ['ofertas', 'lista', estado, pagina, limite],
    queryFn: () => pedir<Pagina<Oferta>>(`/ofertas?${parametros}`),
    placeholderData: keepPreviousData,
  });
}

export function useOferta(id: string) {
  return useQuery({
    queryKey: ['ofertas', 'detalle', id],
    queryFn: () => pedir<DetalleOferta>(`/ofertas/${enUrl(id)}`),
  });
}

export function usePostulantes(id: string) {
  return useQuery({
    queryKey: ['ofertas', 'postulantes', id],
    queryFn: () => pedir<{ postulantes: Postulante[] }>(`/ofertas/${enUrl(id)}/postulaciones`),
  });
}

export function useCandidatos(id: string) {
  return useQuery({
    queryKey: ['ofertas', 'candidatos', id],
    queryFn: () => pedir<{ datos: Candidato[] }>(`/ofertas/${enUrl(id)}/candidatos`),
  });
}

export const useCrearOferta = () =>
  useEscritura(({ estado: _estado, ...datos }: DatosOferta) =>
    pedir<Oferta>('/ofertas', { metodo: 'POST', cuerpo: datos }),
  );

export const useActualizarOferta = (id: string) =>
  useEscritura((cambios: Partial<DatosOferta>) => pedir(`/ofertas/${enUrl(id)}`, { metodo: 'PATCH', cuerpo: cambios }));

export const useEliminarOferta = () =>
  useEscritura((id: string) => pedir(`/ofertas/${enUrl(id)}`, { metodo: 'DELETE' }), { esperar: false });

export const usePonerRequisito = (ofertaId: string) =>
  useEscritura(({ habilidadId, ...requisito }: { habilidadId: string; nivelMinimo: number; obligatoria: boolean }) =>
    pedir(`/ofertas/${enUrl(ofertaId)}/habilidades/${enUrl(habilidadId)}`, { metodo: 'PUT', cuerpo: requisito }),
  );

export const useQuitarRequisito = (ofertaId: string) =>
  useEscritura((habilidadId: string) =>
    pedir(`/ofertas/${enUrl(ofertaId)}/habilidades/${enUrl(habilidadId)}`, { metodo: 'DELETE' }),
  );

export const useCambiarPostulacion = (ofertaId: string) =>
  useEscritura(({ usuarioId, estado }: { usuarioId: string; estado: string }) =>
    pedir(`/ofertas/${enUrl(ofertaId)}/postulaciones/${enUrl(usuarioId)}`, { metodo: 'PATCH', cuerpo: { estado } }),
  );
