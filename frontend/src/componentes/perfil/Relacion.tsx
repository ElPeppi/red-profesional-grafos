import { Link } from 'react-router';
import { useAceptarSolicitud, useContactosEnComun, useEnviarSolicitud, useRelacion, useRetirarSolicitud } from '../../api/red';
import { useUsuarioActual } from '../../contexto/UsuarioActual';
import { useAccion } from '../../utiles';
import { Boton, Insignia, Tarjeta, TextoDeError } from '../ui';

/** Lo que puede hacer la persona elegida en "Actuar como" frente a este perfil. */
export function AccionesDeRelacion({ otroId }: { otroId: string }) {
  const { id: actual } = useUsuarioActual();
  const relacion = useRelacion(actual, otroId);
  const enviar = useEnviarSolicitud();
  const aceptar = useAceptarSolicitud();
  const retirar = useRetirarSolicitud();
  const { ejecutar, error, ocupado } = useAccion();

  if (!actual || actual === otroId) return null;

  const estado = relacion.data;
  const mia = { solicitanteId: actual, destinoId: otroId };
  const suya = { solicitanteId: otroId, destinoId: actual };
  const sinRelacion = estado && !estado.conectados && !estado.solicitudEnviada && !estado.solicitudRecibida;

  return (
    <div role="group" aria-label="Relación contigo" className="flex flex-wrap items-center gap-2">
      {estado?.conectados && <Insignia>Conectados</Insignia>}
      {estado?.solicitudEnviada && (
        <>
          <span className="text-sm text-suave">Solicitud enviada</span>
          <Boton disabled={ocupado} onClick={() => void ejecutar(() => retirar.mutateAsync(mia))}>
            Cancelar solicitud
          </Boton>
        </>
      )}
      {estado?.solicitudRecibida && (
        <>
          <span className="text-sm text-suave">Te envió una solicitud</span>
          <Boton variante="primario" disabled={ocupado} onClick={() => void ejecutar(() => aceptar.mutateAsync(suya))}>
            Aceptar
          </Boton>
          <Boton disabled={ocupado} onClick={() => void ejecutar(() => retirar.mutateAsync(suya))}>
            Rechazar
          </Boton>
        </>
      )}
      {sinRelacion && (
        <Boton variante="primario" disabled={ocupado} onClick={() => void ejecutar(() => enviar.mutateAsync(mia))}>
          Conectar
        </Boton>
      )}
      <TextoDeError error={error ?? relacion.error} />
    </div>
  );
}

export function ContactosEnComun({ otroId }: { otroId: string }) {
  const { id: actual, usuario } = useUsuarioActual();
  const { data, error } = useContactosEnComun(actual, otroId);

  if (!actual || actual === otroId) return null;

  return (
    <Tarjeta titulo="Contactos en común">
      <p className="-mt-2 text-xs text-suave">Con {usuario?.nombre ?? 'la persona que representas'}</p>
      <TextoDeError error={error} />
      {data?.datos.length === 0 && <p className="text-sm text-suave">Ninguno todavía.</p>}
      <ul className="flex flex-col gap-2">
        {data?.datos.map((contacto) => (
          <li key={contacto.id} className="text-sm">
            <Link to={`/personas/${contacto.id}`} className="font-semibold hover:underline">
              {contacto.contacto}
            </Link>
            <span className="block text-xs text-suave">{contacto.titular}</span>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}
