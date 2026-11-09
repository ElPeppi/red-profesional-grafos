import { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useUsuarios, type Usuario } from '../api/usuarios';
import { Paginacion } from '../componentes/Paginacion';
import { Avatar, Cargando, clasesBoton, clasesControl, Insignia, MensajeError, Vacio } from '../componentes/ui';
import { experiencia, useDemorado } from '../utiles';

const POR_PAGINA = 12;

/** La página viene de la URL, donde cualquiera puede escribir: lo inválido vale 1. */
function leerPagina(valor: string | null) {
  const pagina = Number(valor);
  return Number.isSafeInteger(pagina) && pagina > 0 ? pagina : 1;
}

function TarjetaPersona({ usuario }: { usuario: Usuario }) {
  return (
    <li>
      <Link
        to={`/personas/${usuario.id}`}
        className="flex h-full gap-3 rounded-xl border border-borde bg-tarjeta p-4 transition-colors hover:border-marca"
      >
        <Avatar nombre={usuario.nombre} />
        <span className="flex min-w-0 flex-col gap-1">
          <span className="truncate font-semibold">{usuario.nombre}</span>
          <span className="line-clamp-2 text-sm text-suave">{usuario.titular || 'Sin titular'}</span>
          <span className="text-xs text-suave">
            {usuario.ciudad.nombre} · {experiencia(usuario.aniosExperiencia)}
          </span>
          {usuario.abiertoAOfertas && (
            <span className="mt-1">
              <Insignia>Abierto a ofertas</Insignia>
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

export function Personas() {
  // La búsqueda vive en la URL: recargar o volver atrás conserva lo que estabas viendo.
  const [parametros, setParametros] = useSearchParams();
  const texto = parametros.get('q') ?? '';
  const pagina = leerPagina(parametros.get('pagina'));

  const busqueda = useDemorado(texto.trim());
  const { data, error, isPending, isPlaceholderData, refetch } = useUsuarios({
    busqueda,
    pagina,
    limite: POR_PAGINA,
  });

  const cambiarParametros = (q: string, nuevaPagina: number, opciones?: { replace: boolean }) => {
    const nuevos = new URLSearchParams();
    if (q) nuevos.set('q', q);
    if (nuevaPagina > 1) nuevos.set('pagina', String(nuevaPagina));
    setParametros(nuevos, opciones);
  };

  const ultima = data ? Math.max(1, Math.ceil(data.total / POR_PAGINA)) : 1;

  // Pasa al borrar a la única persona de la última página, o con una URL vieja.
  const fueraDeRango = Boolean(data) && !isPlaceholderData && pagina > ultima;
  useEffect(() => {
    if (fueraDeRango) cambiarParametros(texto, ultima, { replace: true });
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personas</h1>
          <p className="mt-1 text-sm text-suave" role="status">
            {data ? (data.total === 1 ? '1 persona' : `${data.total} personas`) : ' '}
          </p>
        </div>
        <Link to="/personas/nueva" className={clasesBoton.primario}>
          Nueva persona
        </Link>
      </div>

      <input
        type="search"
        aria-label="Buscar personas"
        placeholder="Buscar por nombre o titular"
        className={clasesControl}
        maxLength={100}
        value={texto}
        onChange={(evento) => cambiarParametros(evento.target.value, 1, { replace: true })}
      />

      {error && !data && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}

      {data?.datos.length === 0 && !fueraDeRango && (
        <Vacio>{busqueda ? `Nadie coincide con «${busqueda}».` : 'Todavía no hay personas.'}</Vacio>
      )}

      {data && data.datos.length > 0 && (
        <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
          {data.datos.map((usuario) => (
            <TarjetaPersona key={usuario.id} usuario={usuario} />
          ))}
        </ul>
      )}

      <Paginacion pagina={pagina} ultima={ultima} alCambiar={(nueva) => cambiarParametros(texto, nueva)} />
    </div>
  );
}
