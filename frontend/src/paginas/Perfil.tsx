import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ErrorApi } from '../api/cliente';
import { useEliminarUsuario, usePerfil, type Perfil as DatosPerfil } from '../api/usuarios';
import { AccionesDeRelacion, ContactosEnComun } from '../componentes/perfil/Relacion';
import { Similares } from '../componentes/perfil/Similares';
import { SeccionEmpleos, SeccionHabilidades, SeccionProyectos } from '../componentes/perfil/Vinculos';
import { Avatar, Boton, Cargando, clasesBoton, Insignia, MensajeError, Vacio } from '../componentes/ui';
import { useUsuarioActual } from '../contexto/UsuarioActual';
import { experiencia, useSinRepetir } from '../utiles';

interface PropsConfirmar {
  usuario: DatosPerfil;
  abierto: boolean;
  alCerrar: () => void;
}

function ConfirmarEliminar({ usuario, abierto, alCerrar }: PropsConfirmar) {
  const dialogo = useRef<HTMLDialogElement>(null);
  const navegar = useNavigate();
  const eliminar = useEliminarUsuario();
  const sinRepetir = useSinRepetir();

  // showModal, no el atributo open: atrapa el foco y cierra con Escape.
  useEffect(() => {
    if (abierto) dialogo.current?.showModal();
    else dialogo.current?.close();
  }, [abierto]);

  return (
    <dialog
      ref={dialogo}
      aria-labelledby="titulo-eliminar"
      onClose={alCerrar}
      className="m-auto w-full max-w-md rounded-xl bg-tarjeta p-6 text-tinta shadow-xl"
    >
      <h2 id="titulo-eliminar" className="text-lg font-bold">
        ¿Eliminar a {usuario.nombre}?
      </h2>
      <p className="mt-2 text-sm text-suave">
        También se borran sus conexiones, solicitudes y postulaciones. No se puede deshacer.
      </p>
      {eliminar.error && (
        <div className="mt-4">
          <MensajeError error={eliminar.error} />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Boton onClick={alCerrar}>Cancelar</Boton>
        <Boton
          variante="peligro"
          disabled={eliminar.isPending}
          onClick={() =>
            void sinRepetir(async () => {
              await eliminar.mutateAsync(usuario.id);
              await navegar('/personas');
            })
          }
        >
          {eliminar.isPending ? 'Eliminando…' : 'Eliminar'}
        </Boton>
      </div>
    </dialog>
  );
}

function ContenidoPerfil({ usuario }: { usuario: DatosPerfil }) {
  const { id: idActual, elegir } = useUsuarioActual();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar nombre={usuario.nombre} grande />
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight">{usuario.nombre}</h1>
            <p className="mt-1 text-suave">{usuario.titular || 'Sin titular'}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {idActual !== usuario.id && <Boton onClick={() => elegir(usuario.id)}>Actuar como esta persona</Boton>}
          <Link to={`/personas/${usuario.id}/editar`} className={clasesBoton.secundario}>
            Editar
          </Link>
          <Boton variante="peligroSuave" onClick={() => setConfirmando(true)}>
            Eliminar
          </Boton>
        </div>
      </div>

      <AccionesDeRelacion otroId={usuario.id} />

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-suave">
        <span>
          {usuario.ciudad.nombre}, {usuario.ciudad.departamento}
        </span>
        <span>{usuario.email}</span>
        <span>{experiencia(usuario.aniosExperiencia)} de experiencia</span>
        <span>{usuario.totalConexiones === 1 ? '1 conexión' : `${usuario.totalConexiones} conexiones`}</span>
        {usuario.abiertoAOfertas && <Insignia>Abierto a ofertas</Insignia>}
      </div>

      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <SeccionHabilidades usuario={usuario} />
          <Similares id={usuario.id} />
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          <ContactosEnComun otroId={usuario.id} />
          <SeccionEmpleos usuario={usuario} />
          <SeccionProyectos usuario={usuario} />
        </div>
      </div>

      <ConfirmarEliminar usuario={usuario} abierto={confirmando} alCerrar={() => setConfirmando(false)} />
    </div>
  );
}

export function Perfil() {
  const { id } = useParams();
  const { data: usuario, error, refetch } = usePerfil(id);

  // Va antes que los datos: si la borraron en otra pestaña, la copia en caché ya no vale.
  if (error instanceof ErrorApi && error.estado === 404) {
    return (
      <Vacio>
        Esta persona no existe.{' '}
        <Link to="/personas" className="font-semibold text-marca underline">
          Volver a personas
        </Link>
      </Vacio>
    );
  }
  if (usuario) return <ContenidoPerfil usuario={usuario} />;
  if (error) return <MensajeError error={error} alReintentar={() => void refetch()} />;
  return <Cargando />;
}
