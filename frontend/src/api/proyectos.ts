import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { pedir } from './cliente';
import { useEscritura } from './escritura';
import type { Pagina } from './usuarios';

export interface Proyecto {
  id: string;
  nombre: string;
  descripcion: string;
  estado: string;
  empresa: { id: string; nombre: string } | null;
}

export interface DetalleProyecto extends Proyecto {
  tecnologias: { id: string; nombre: string; categoria: string }[];
  miembros: { id: string; nombre: string; titular: string; rol: string }[];
}

export interface Colaborador {
  id: string;
  colaborador: string;
  titular: string;
  puntaje: number;
  habilidadesUtiles: string[];
  contactosEnProyecto: string[];
}

export interface ParRelacionado {
  id1: string;
  proyecto1: string;
  id2: string;
  proyecto2: string;
  tecnologias: string[];
  miembrosEnComun: string[];
  miembrosConectados: string[];
}

export interface DatosProyecto {
  nombre: string;
  descripcion: string;
  estado: string;
  empresaId: string;
}

export const ESTADOS_PROYECTO = ['en curso', 'finalizado'];

const enUrl = encodeURIComponent;

export function useListaProyectos(pagina: number, limite: number) {
  return useQuery({
    queryKey: ['proyectos', 'lista', pagina, limite],
    queryFn: () => pedir<Pagina<Proyecto>>(`/proyectos?pagina=${pagina}&limite=${limite}`),
    placeholderData: keepPreviousData,
  });
}

export function useProyecto(id: string) {
  return useQuery({
    queryKey: ['proyectos', 'detalle', id],
    queryFn: () => pedir<DetalleProyecto>(`/proyectos/${enUrl(id)}`),
  });
}

export function useColaboradores(id: string) {
  return useQuery({
    queryKey: ['proyectos', 'colaboradores', id],
    queryFn: () => pedir<{ datos: Colaborador[] }>(`/proyectos/${enUrl(id)}/colaboradores`),
  });
}

export function useProyectosRelacionados() {
  return useQuery({
    queryKey: ['proyectos', 'relacionados'],
    queryFn: () => pedir<{ datos: ParRelacionado[] }>('/proyectos/relacionados'),
  });
}

// Sin empresa es comunitario: un texto vacío no es un id, así que no se envía.
export const useCrearProyecto = () =>
  useEscritura(({ empresaId, ...datos }: DatosProyecto) =>
    pedir<Proyecto>('/proyectos', { metodo: 'POST', cuerpo: empresaId ? { ...datos, empresaId } : datos }),
  );

export const useActualizarProyecto = (id: string) =>
  useEscritura((cambios: Partial<DatosProyecto>) =>
    pedir(`/proyectos/${enUrl(id)}`, { metodo: 'PATCH', cuerpo: cambios }),
  );

export const useEliminarProyecto = () =>
  useEscritura((id: string) => pedir(`/proyectos/${enUrl(id)}`, { metodo: 'DELETE' }), { esperar: false });

export const usePonerTecnologia = (proyectoId: string) =>
  useEscritura((habilidadId: string) =>
    pedir(`/proyectos/${enUrl(proyectoId)}/habilidades/${enUrl(habilidadId)}`, { metodo: 'PUT' }),
  );

export const useQuitarTecnologia = (proyectoId: string) =>
  useEscritura((habilidadId: string) =>
    pedir(`/proyectos/${enUrl(proyectoId)}/habilidades/${enUrl(habilidadId)}`, { metodo: 'DELETE' }),
  );

// La participación es un vínculo del usuario: vive bajo /usuarios aunque se edite desde el proyecto.
export const usePonerMiembro = (proyectoId: string) =>
  useEscritura(({ usuarioId, rol }: { usuarioId: string; rol: string }) =>
    pedir(`/usuarios/${enUrl(usuarioId)}/proyectos/${enUrl(proyectoId)}`, { metodo: 'PUT', cuerpo: { rol } }),
  );

export const useQuitarMiembro = (proyectoId: string) =>
  useEscritura((usuarioId: string) =>
    pedir(`/usuarios/${enUrl(usuarioId)}/proyectos/${enUrl(proyectoId)}`, { metodo: 'DELETE' }),
  );
