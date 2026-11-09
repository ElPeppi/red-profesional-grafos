import { useId, useState, type KeyboardEvent } from 'react';
import { ErrorApi } from '../api/cliente';
import { useUsuarios, type Usuario } from '../api/usuarios';
import { useDemorado } from '../utiles';
import { Avatar, clasesControl } from './ui';

interface Props {
  etiqueta: string;
  alElegir: (usuario: Usuario) => void;
  alCancelar?: () => void;
  enfocar?: boolean;
}

/** Elegir persona buscando: una lista desplegable no sirve con miles de usuarios. */
export function ComboPersona({ etiqueta, alElegir, alCancelar, enfocar = false }: Props) {
  const [texto, setTexto] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const idLista = useId();

  const busqueda = useDemorado(texto.trim());
  const { data, error, isPending, isPlaceholderData } = useUsuarios(
    { busqueda, pagina: 1, limite: 6 },
    { activa: abierto },
  );

  const opciones = data?.datos ?? [];
  // Mientras llega la búsqueda nueva, en pantalla sigue la anterior: Enter no debe elegir de ahí.
  const vigente = !isPlaceholderData && busqueda === texto.trim();

  const elegir = (usuario: Usuario) => {
    setTexto('');
    setAbierto(false);
    alElegir(usuario);
  };

  const alTeclear = (evento: KeyboardEvent) => {
    if (evento.key === 'ArrowDown' || evento.key === 'ArrowUp') {
      evento.preventDefault();
      setAbierto(true);
      if (opciones.length > 0) {
        const paso = evento.key === 'ArrowDown' ? 1 : -1;
        setActivo((actual) => (actual + paso + opciones.length) % opciones.length);
      }
    } else if (evento.key === 'Enter') {
      const opcion = opciones[activo];
      if (abierto && vigente && opcion) elegir(opcion);
    } else if (evento.key === 'Escape') {
      setAbierto(false);
      alCancelar?.();
    }
  };

  const idOpcion = (usuario: Usuario) => `${idLista}-${usuario.id}`;
  const opcionActiva = abierto ? opciones[activo] : undefined;

  return (
    <div className="relative w-64 max-w-full">
      <input
        role="combobox"
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={opcionActiva && idOpcion(opcionActiva)}
        autoFocus={enfocar}
        className={clasesControl}
        placeholder={`${etiqueta}…`}
        value={texto}
        maxLength={100}
        onChange={(evento) => {
          setTexto(evento.target.value);
          setActivo(0);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => {
          setAbierto(false);
          alCancelar?.();
        }}
        onKeyDown={alTeclear}
      />

      {abierto && (
        <div className="absolute right-0 z-20 mt-1 w-80 max-w-[90vw] overflow-hidden rounded-lg border border-borde bg-tarjeta shadow-lg">
          <ul role="listbox" id={idLista} aria-label={etiqueta}>
            {opciones.map((usuario, indice) => (
              <li
                key={usuario.id}
                id={idOpcion(usuario)}
                role="option"
                aria-selected={indice === activo}
                className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 ${indice === activo ? 'bg-marca-suave' : ''}`}
                onMouseEnter={() => setActivo(indice)}
                // mouseDown va antes que blur: con click, el blur cerraría la lista primero.
                onMouseDown={(evento) => {
                  evento.preventDefault();
                  elegir(usuario);
                }}
              >
                <Avatar nombre={usuario.nombre} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{usuario.nombre}</span>
                  <span className="block truncate text-xs text-suave">{usuario.titular}</span>
                </span>
              </li>
            ))}
          </ul>
          {error && (
            <p role="alert" className="px-3 py-2 text-sm text-peligro">
              {error instanceof ErrorApi ? error.message : 'No se pudo buscar'}
            </p>
          )}
          {!error && isPending && <p className="px-3 py-2 text-sm text-suave">Buscando…</p>}
          {!error && !isPending && vigente && opciones.length === 0 && (
            <p className="px-3 py-2 text-sm text-suave">Nadie coincide</p>
          )}
        </div>
      )}
    </div>
  );
}
