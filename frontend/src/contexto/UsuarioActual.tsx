import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ErrorApi } from '../api/cliente';
import { usePerfil, type Perfil } from '../api/usuarios';

interface ValorUsuarioActual {
  id: string | null;
  usuario: Perfil | null;
  fallo: boolean;
  elegir: (id: string | null) => void;
}

const CLAVE = 'red-profesional:usuario-actual';

const Contexto = createContext<ValorUsuarioActual | null>(null);

/** Persona que el usuario de la demo está representando. No es autenticación: no hay login. */
export function ProveedorUsuarioActual({ children }: { children: ReactNode }) {
  const [id, setId] = useState(() => localStorage.getItem(CLAVE));
  const { data: usuario, error } = usePerfil(id);

  const elegir = useCallback((nuevo: string | null) => {
    setId(nuevo);
    if (nuevo) localStorage.setItem(CLAVE, nuevo);
    else localStorage.removeItem(CLAVE);
  }, []);

  // Solo un 404 la suelta: si el backend está caído, la persona sigue elegida al volver.
  useEffect(() => {
    if (error instanceof ErrorApi && error.estado === 404) elegir(null);
  }, [error, elegir]);

  const fallo = Boolean(error);
  const valor = useMemo(() => ({ id, usuario: usuario ?? null, fallo, elegir }), [id, usuario, fallo, elegir]);

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useUsuarioActual() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useUsuarioActual requiere ProveedorUsuarioActual');
  return valor;
}
