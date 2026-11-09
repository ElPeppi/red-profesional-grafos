import { useState } from 'react';
import { Link } from 'react-router';
import { useAceptarSolicitud, useConexiones, useEnviarSolicitud, useRetirarSolicitud, useSolicitudes, type Solicitud } from '../api/red';
import {
  useContactosSugeridos,
  useEmpleosSugeridos,
  usePostulaciones,
  usePostularse,
  type ContactoSugerido,
  type EmpleoSugerido,
} from '../api/recomendaciones';
import { Paginacion } from '../componentes/Paginacion';
import { Avatar, Boton, Cargando, Insignia, MensajeError, Tarjeta, TextoDeError, Vacio } from '../componentes/ui';
import { useUsuarioActual } from '../contexto/UsuarioActual';
import { diaMesAnio, listaLegible, plural, useAccion } from '../utiles';

const CONEXIONES_POR_PAGINA = 10;

interface PropsConsulta {
  error: unknown;
  cargando: boolean;
  alReintentar: () => void;
}

function EstadoDeConsulta({ error, cargando, alReintentar }: PropsConsulta) {
  if (error) return <MensajeError error={error} alReintentar={alReintentar} />;
  if (cargando) return <Cargando />;
  return null;
}

function Persona({ id, nombre, detalle }: { id: string; nombre: string; detalle: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar nombre={nombre} />
      <span className="min-w-0">
        <Link to={`/personas/${id}`} className="block truncate text-sm font-semibold hover:underline">
          {nombre}
        </Link>
        <span className="block truncate text-xs text-suave">{detalle}</span>
      </span>
    </span>
  );
}

// ---------- Solicitudes ----------

function SolicitudRecibida({ yo, solicitud }: { yo: string; solicitud: Solicitud }) {
  const aceptar = useAceptarSolicitud();
  const rechazar = useRetirarSolicitud();
  const { ejecutar, error, ocupado } = useAccion();
  const par = { solicitanteId: solicitud.id, destinoId: yo };

  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Persona id={solicitud.id} nombre={solicitud.nombre} detalle={`Desde el ${diaMesAnio(solicitud.fecha)}`} />
        <span className="flex gap-2">
          <Boton
            variante="primario"
            aria-label={`Aceptar a ${solicitud.nombre}`}
            disabled={ocupado}
            onClick={() => void ejecutar(() => aceptar.mutateAsync(par))}
          >
            Aceptar
          </Boton>
          <Boton
            aria-label={`Rechazar a ${solicitud.nombre}`}
            disabled={ocupado}
            onClick={() => void ejecutar(() => rechazar.mutateAsync(par))}
          >
            Rechazar
          </Boton>
        </span>
      </div>
      <TextoDeError error={error} />
    </li>
  );
}

function SolicitudEnviada({ yo, solicitud }: { yo: string; solicitud: Solicitud }) {
  const cancelar = useRetirarSolicitud();
  const { ejecutar, error, ocupado } = useAccion();

  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-3">
        <Persona id={solicitud.id} nombre={solicitud.nombre} detalle={diaMesAnio(solicitud.fecha)} />
        <Boton
          aria-label={`Cancelar solicitud a ${solicitud.nombre}`}
          disabled={ocupado}
          onClick={() => void ejecutar(() => cancelar.mutateAsync({ solicitanteId: yo, destinoId: solicitud.id }))}
        >
          Cancelar
        </Boton>
      </div>
      <TextoDeError error={error} />
    </li>
  );
}

function Solicitudes({ yo, tipo }: { yo: string; tipo: 'recibidas' | 'enviadas' }) {
  const { data, error, isPending, refetch } = useSolicitudes(yo);
  const lista = data?.[tipo];

  return (
    <Tarjeta titulo={tipo === 'recibidas' ? 'Solicitudes recibidas' : 'Solicitudes enviadas'}>
      <EstadoDeConsulta error={error} cargando={isPending} alReintentar={() => void refetch()} />
      {lista?.length === 0 && (
        <p className="text-sm text-suave">
          {tipo === 'recibidas' ? 'No tienes solicitudes pendientes.' : 'No has enviado solicitudes pendientes.'}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {lista?.map((solicitud) =>
          tipo === 'recibidas' ? (
            <SolicitudRecibida key={solicitud.id} yo={yo} solicitud={solicitud} />
          ) : (
            <SolicitudEnviada key={solicitud.id} yo={yo} solicitud={solicitud} />
          ),
        )}
      </ul>
    </Tarjeta>
  );
}

// ---------- Recomendaciones ----------

function razonesDeContacto(sugerido: ContactoSugerido) {
  const razones: string[] = [];
  const { contactosEnComun, empresasEnComun, habilidadesEnComun } = sugerido;
  if (contactosEnComun.length > 0) {
    razones.push(
      `${plural(contactosEnComun.length, 'contacto en común', 'contactos en común')}: ${listaLegible(contactosEnComun)}`,
    );
  }
  if (empresasEnComun.length > 0) razones.push(`Coincidieron en ${listaLegible(empresasEnComun)}`);
  if (habilidadesEnComun.length > 0) {
    razones.push(
      `${plural(habilidadesEnComun.length, 'habilidad en común', 'habilidades en común')}: ${listaLegible(habilidadesEnComun)}`,
    );
  }
  if (sugerido.mismaCiudad) razones.push('Viven en la misma ciudad');
  return razones;
}

function PersonaSugerida({ yo, sugerido }: { yo: string; sugerido: ContactoSugerido }) {
  const enviar = useEnviarSolicitud();
  const { ejecutar, error, ocupado } = useAccion();

  return (
    <li className="flex flex-col gap-2 border-t border-borde pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Persona id={sugerido.id} nombre={sugerido.sugerido} detalle={sugerido.titular} />
        <Boton
          variante="primario"
          aria-label={`Conectar con ${sugerido.sugerido}`}
          disabled={ocupado}
          onClick={() => void ejecutar(() => enviar.mutateAsync({ solicitanteId: yo, destinoId: sugerido.id }))}
        >
          Conectar
        </Boton>
      </div>
      <ul className="flex flex-col gap-0.5 pl-11.5 text-xs text-suave">
        {razonesDeContacto(sugerido).map((razon) => (
          <li key={razon}>{razon}</li>
        ))}
      </ul>
      <TextoDeError error={error} />
    </li>
  );
}

function PersonasSugeridas({ yo }: { yo: string }) {
  const { data, error, isPending, refetch } = useContactosSugeridos(yo);

  return (
    <Tarjeta titulo="Personas que podrías conocer">
      <p className="-mt-2 text-xs text-suave">Contactos de tus contactos, empresas, habilidades y ciudad.</p>
      <EstadoDeConsulta error={error} cargando={isPending} alReintentar={() => void refetch()} />
      {data?.datos.length === 0 && <p className="text-sm text-suave">Sin sugerencias por ahora.</p>}
      <ul className="flex flex-col gap-3">
        {data?.datos.map((sugerido) => (
          <PersonaSugerida key={sugerido.id} yo={yo} sugerido={sugerido} />
        ))}
      </ul>
    </Tarjeta>
  );
}

function razonesDeEmpleo(empleo: EmpleoSugerido) {
  const opcionales = empleo.faltan.filter((h) => !empleo.faltanObligatorias.includes(h));
  return [
    empleo.cumple.length > 0 && { texto: `Cumples: ${listaLegible(empleo.cumple)}` },
    empleo.faltanObligatorias.length > 0 && {
      texto: `Obligatorias que te faltan: ${listaLegible(empleo.faltanObligatorias)}`,
      alerta: true,
    },
    opcionales.length > 0 && { texto: `Deseables que te faltan: ${listaLegible(opcionales)}` },
    empleo.contactosEnEmpresa.length > 0 && { texto: `Conoces ahí a ${listaLegible(empleo.contactosEnEmpresa)}` },
    empleo.mismaCiudad && { texto: 'En tu ciudad' },
  ].filter((razon) => razon !== false);
}

function EmpleoSugerido({ yo, empleo }: { yo: string; empleo: EmpleoSugerido }) {
  const postularse = usePostularse(yo);
  const { ejecutar, error, ocupado } = useAccion();

  return (
    <li className="flex flex-col gap-2 border-t border-borde pt-3 first:border-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <span className="min-w-0">
          <Link to={`/ofertas/${empleo.id}`} className="block text-sm font-semibold hover:underline">
            {empleo.oferta}
          </Link>
          <span className="block text-xs text-suave">
            {empleo.empresa} · {empleo.modalidad} · ajuste {empleo.puntaje} %
          </span>
        </span>
        <Boton
          variante="primario"
          aria-label={`Postularme a ${empleo.oferta}`}
          disabled={ocupado}
          onClick={() => void ejecutar(() => postularse.mutateAsync(empleo.id))}
        >
          Postularme
        </Boton>
      </div>
      <ul className="flex flex-col gap-0.5 text-xs text-suave">
        {razonesDeEmpleo(empleo).map((razon) => (
          <li key={razon.texto} className={razon.alerta ? 'font-semibold text-peligro' : ''}>
            {razon.texto}
          </li>
        ))}
      </ul>
      <TextoDeError error={error} />
    </li>
  );
}

function EmpleosSugeridos({ yo }: { yo: string }) {
  const { data, error, isPending, refetch } = useEmpleosSugeridos(yo);

  return (
    <Tarjeta titulo="Empleos para ti">
      <p className="-mt-2 text-xs text-suave">
        60 % habilidades, 30 % contactos en la empresa y 10 % ciudad. Primero las que cumples completas.
      </p>
      <EstadoDeConsulta error={error} cargando={isPending} alReintentar={() => void refetch()} />
      {data?.datos.length === 0 && (
        <p className="text-sm text-suave">Ninguna oferta abierta pide tus habilidades al nivel que tienes.</p>
      )}
      <ul className="flex flex-col gap-3">
        {data?.datos.map((empleo) => (
          <EmpleoSugerido key={empleo.id} yo={yo} empleo={empleo} />
        ))}
      </ul>
    </Tarjeta>
  );
}

// ---------- Columna lateral ----------

function MisConexiones({ yo }: { yo: string }) {
  const [pagina, setPagina] = useState(1);
  const { data, error, isPending, refetch } = useConexiones(yo, pagina, CONEXIONES_POR_PAGINA);
  const ultima = data ? Math.max(1, Math.ceil(data.total / CONEXIONES_POR_PAGINA)) : 1;

  return (
    <Tarjeta titulo={data ? `Conexiones (${data.total})` : 'Conexiones'}>
      <EstadoDeConsulta error={error} cargando={isPending} alReintentar={() => void refetch()} />
      {data?.total === 0 && <p className="text-sm text-suave">Todavía no tienes conexiones.</p>}
      <ul className="flex flex-col gap-3">
        {data?.datos.map((conexion) => (
          <li key={conexion.id}>
            <Persona
              id={conexion.id}
              nombre={conexion.nombre}
              detalle={`${conexion.ciudad} · desde ${diaMesAnio(conexion.desde)}`}
            />
          </li>
        ))}
      </ul>
      <Paginacion pagina={Math.min(pagina, ultima)} ultima={ultima} alCambiar={setPagina} />
    </Tarjeta>
  );
}

function MisPostulaciones({ yo }: { yo: string }) {
  const { data, error, isPending, refetch } = usePostulaciones(yo);

  return (
    <Tarjeta titulo="Mis postulaciones">
      <EstadoDeConsulta error={error} cargando={isPending} alReintentar={() => void refetch()} />
      {data?.postulaciones.length === 0 && <p className="text-sm text-suave">No te has postulado a ninguna oferta.</p>}
      <ul className="flex flex-col gap-3">
        {data?.postulaciones.map((postulacion) => (
          <li key={postulacion.id} className="text-sm">
            <Link to={`/ofertas/${postulacion.id}`} className="block font-semibold hover:underline">
              {postulacion.titulo}
            </Link>
            <span className="flex flex-wrap items-center gap-x-2 text-xs text-suave">
              {postulacion.empresa} · {diaMesAnio(postulacion.fecha)}
              <Insignia>{postulacion.estado}</Insignia>
              {postulacion.estadoOferta === 'cerrada' && <span>oferta cerrada</span>}
            </span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

export function MiRed() {
  const { id, usuario } = useUsuarioActual();

  if (!id) {
    return <Vacio>Para ver tu red, elige a quién representar en «Actuar como», arriba a la derecha.</Vacio>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mi red</h1>
        <p className="mt-1 text-sm text-suave">
          Como{' '}
          <Link to={`/personas/${id}`} className="font-semibold text-tinta hover:underline">
            {usuario?.nombre ?? '…'}
          </Link>
        </p>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="flex min-w-0 flex-col gap-5">
          <Solicitudes yo={id} tipo="recibidas" />
          <PersonasSugeridas yo={id} />
          <EmpleosSugeridos yo={id} />
        </div>
        <div className="flex min-w-0 flex-col gap-5">
          <Solicitudes yo={id} tipo="enviadas" />
          <MisConexiones key={id} yo={id} />
          <MisPostulaciones yo={id} />
        </div>
      </div>
    </div>
  );
}
