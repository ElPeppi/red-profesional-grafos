import { useState } from 'react';
import { Link } from 'react-router';
import { useUsuarioActual } from '../contexto/UsuarioActual';
import { ComboPersona } from './ComboPersona';
import { Avatar } from './ui';

const CLASE_ENLACE = 'text-xs font-semibold text-suave underline-offset-2 hover:text-tinta hover:underline';

export function SelectorUsuario() {
  const { id, usuario, fallo, elegir } = useUsuarioActual();
  const [cambiando, setCambiando] = useState(false);

  if (cambiando || !id) {
    return (
      <ComboPersona
        etiqueta="Actuar como"
        enfocar={cambiando}
        alElegir={(elegido) => {
          elegir(elegido.id);
          setCambiando(false);
        }}
        alCancelar={() => setCambiando(false)}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      {usuario ? (
        <Link to={`/personas/${usuario.id}`} className="flex min-w-0 items-center gap-2">
          <Avatar nombre={usuario.nombre} />
          <span className="min-w-0 leading-tight">
            <span className="block text-xs text-suave">Actuando como</span>
            <span className="block max-w-44 truncate text-sm font-semibold">{usuario.nombre}</span>
          </span>
        </Link>
      ) : (
        <span className="text-sm text-suave">{fallo ? 'Persona no disponible' : 'Cargando…'}</span>
      )}
      <button type="button" className={CLASE_ENLACE} onClick={() => setCambiando(true)}>
        Cambiar
      </button>
      <button type="button" className={CLASE_ENLACE} onClick={() => elegir(null)}>
        Salir
      </button>
    </div>
  );
}
