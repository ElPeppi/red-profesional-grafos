import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import { useEscritura } from './escritura';
import type { Pagina } from './usuarios';

export interface Solicitud {
  id: string;
  nombre: string;
  titular: string;
  fecha: string;
}

export interface Conexion {
  id: string;
  nombre: string;
  titular: string;
  ciudad: string;
  desde: string;
}

export interface Relacion {
  conectados: boolean;
  solicitudEnviada: boolean;
  solicitudRecibida: boolean;
}

export interface ContactoComun {
  id: string;
  contacto: string;
  titular: string;
}

interface Par {
  solicitanteId: string;
  destinoId: string;
}

const enUrl = encodeURIComponent;

export function useSolicitudes(id: string) {
  return useQuery({
    queryKey: ['red', 'solicitudes', id],
    queryFn: () => pedir<{ recibidas: Solicitud[]; enviadas: Solicitud[] }>(`/usuarios/${enUrl(id)}/solicitudes`),
  });
}

export function useConexiones(id: string, pagina: number, limite: number) {
  return useQuery({
    queryKey: ['red', 'conexiones', id, pagina, limite],
    queryFn: () => pedir<Pagina<Conexion>>(`/usuarios/${enUrl(id)}/conexiones?pagina=${pagina}&limite=${limite}`),
    placeholderData: keepPreviousData,
  });
}

/** Sin persona elegida, o mirando el propio perfil, no hay relación que pedir. */
export function useRelacion(id: string | null, otroId: string) {
  return useQuery({
    queryKey: ['red', 'relacion', id, otroId],
    queryFn: id && id !== otroId ? () => pedir<Relacion>(`/usuarios/${enUrl(id)}/relacion/${enUrl(otroId)}`) : skipToken,
  });
}

export function useContactosEnComun(id: string | null, otroId: string) {
  return useQuery({
    queryKey: ['red', 'comunes', id, otroId],
    queryFn:
      id && id !== otroId
        ? () => pedir<{ datos: ContactoComun[] }>(`/usuarios/${enUrl(id)}/contactos-comunes/${enUrl(otroId)}`)
        : skipToken,
  });
}

export const useEnviarSolicitud = () =>
  useEscritura(({ solicitanteId, destinoId }: Par) =>
    pedir(`/usuarios/${enUrl(solicitanteId)}/solicitudes`, { metodo: 'POST', cuerpo: { destinoId } }),
  );

export const useAceptarSolicitud = () =>
  useEscritura((par: Par) => pedir('/solicitudes/aceptar', { metodo: 'POST', cuerpo: par }));

/** Sirve para rechazar una recibida y para cancelar una enviada: en ambos casos se borra. */
export const useRetirarSolicitud = () =>
  useEscritura((par: Par) => pedir('/solicitudes/rechazar', { metodo: 'POST', cuerpo: par }));
