import { pedir } from './cliente';
import { useEscritura } from './escritura';

const enUrl = encodeURIComponent;
const ruta = (usuarioId: string, tipo: string, otroId: string) =>
  `/usuarios/${enUrl(usuarioId)}/${tipo}/${enUrl(otroId)}`;

// PUT nombra el vínculo completo en la URL: repetirlo actualiza, no duplica.

export const usePonerHabilidad = (usuarioId: string) =>
  useEscritura(({ habilidadId, nivel }: { habilidadId: string; nivel: number }) =>
    pedir(ruta(usuarioId, 'habilidades', habilidadId), { metodo: 'PUT', cuerpo: { nivel } }),
  );

export const useQuitarHabilidad = (usuarioId: string) =>
  useEscritura((habilidadId: string) => pedir(ruta(usuarioId, 'habilidades', habilidadId), { metodo: 'DELETE' }));

export interface DatosEmpleo {
  empresaId: string;
  cargo: string;
  desde: string;
  actual: boolean;
}

export const usePonerEmpleo = (usuarioId: string) =>
  useEscritura(({ empresaId, ...empleo }: DatosEmpleo) =>
    pedir(ruta(usuarioId, 'empleos', empresaId), { metodo: 'PUT', cuerpo: empleo }),
  );

export const useQuitarEmpleo = (usuarioId: string) =>
  useEscritura((empresaId: string) => pedir(ruta(usuarioId, 'empleos', empresaId), { metodo: 'DELETE' }));

export const usePonerParticipacion = (usuarioId: string) =>
  useEscritura(({ proyectoId, rol }: { proyectoId: string; rol: string }) =>
    pedir(ruta(usuarioId, 'proyectos', proyectoId), { metodo: 'PUT', cuerpo: { rol } }),
  );

export const useQuitarParticipacion = (usuarioId: string) =>
  useEscritura((proyectoId: string) => pedir(ruta(usuarioId, 'proyectos', proyectoId), { metodo: 'DELETE' }));
