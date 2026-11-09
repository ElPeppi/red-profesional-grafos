import { keepPreviousData, skipToken, useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import { useEscritura } from './escritura';

export interface Ciudad {
  id: string;
  nombre: string;
  departamento: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  email: string;
  titular: string;
  aniosExperiencia: number;
  abiertoAOfertas: boolean;
  creadoEn: string;
  ciudad: Ciudad;
}

export interface Perfil extends Usuario {
  habilidades: { id: string; nombre: string; categoria: string; nivel: number }[];
  empleos: { id: string; nombre: string; cargo: string; desde: string; actual: boolean }[];
  proyectos: { id: string; nombre: string; estado: string; rol: string }[];
  totalConexiones: number;
}

export interface DatosUsuario {
  nombre: string;
  email: string;
  titular: string;
  aniosExperiencia: number;
  abiertoAOfertas: boolean;
  ciudadId: string;
}

export interface Pagina<T> {
  datos: T[];
  total: number;
  pagina: number;
  limite: number;
}

interface PedidoLista {
  busqueda: string;
  pagina: number;
  limite: number;
}

// Todas las llaves empiezan por 'usuarios': invalidar esa raíz refresca listas y perfiles.
const LLAVE = 'usuarios';

function listar({ busqueda, pagina, limite }: PedidoLista) {
  const parametros = new URLSearchParams({ pagina: String(pagina), limite: String(limite) });
  if (busqueda) parametros.set('busqueda', busqueda);
  return pedir<Pagina<Usuario>>(`/usuarios?${parametros}`);
}

export function useUsuarios(pedido: PedidoLista, { activa = true } = {}) {
  return useQuery({
    queryKey: [LLAVE, 'lista', pedido],
    queryFn: () => listar(pedido),
    enabled: activa,
    // Mantiene la lista anterior mientras llega la nueva: la pantalla no parpadea al teclear.
    placeholderData: keepPreviousData,
  });
}

export function usePerfil(id: string | null | undefined) {
  return useQuery({
    queryKey: [LLAVE, 'perfil', id],
    queryFn: id ? () => pedir<Perfil>(`/usuarios/${encodeURIComponent(id)}`) : skipToken,
  });
}

// Como toda escritura (useEscritura): una persona aparece en postulantes, candidatos, recomendaciones,
// miembros y caminos. Invalidar solo la lista de personas dejaba esas pantallas viejas: borrar a alguien
// y volver a una oferta abierta hace menos de 10 s la seguía mostrando entre los postulantes.
export function useCrearUsuario() {
  return useEscritura((datos: DatosUsuario) => pedir<Usuario>('/usuarios', { metodo: 'POST', cuerpo: datos }));
}

export function useActualizarUsuario(id: string) {
  return useEscritura((cambios: Partial<DatosUsuario>) =>
    pedir<Usuario>(`/usuarios/${encodeURIComponent(id)}`, { metodo: 'PATCH', cuerpo: cambios }),
  );
}

export function useEliminarUsuario() {
  return useEscritura((id: string) => pedir<void>(`/usuarios/${encodeURIComponent(id)}`, { metodo: 'DELETE' }), {
    esperar: false,
  });
}
