import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { useHabilidades, type Habilidad } from '../../api/catalogos';
import { errorDeCampo, ErrorApi } from '../../api/cliente';
import { useEmpresas, useProyectos } from '../../api/oportunidades';
import type { Perfil } from '../../api/usuarios';
import {
  usePonerEmpleo,
  usePonerHabilidad,
  usePonerParticipacion,
  useQuitarEmpleo,
  useQuitarHabilidad,
  useQuitarParticipacion,
} from '../../api/vinculos';
import { mesYAnio, useAccion } from '../../utiles';
import { Boton, Campo, clasesBotonTexto, clasesControl, Tarjeta, TextoDeError } from '../ui';

export const NIVELES = [1, 2, 3, 4, 5];
export const NOMBRE_NIVEL: Record<number, string> = { 1: '1 · básico', 3: '3 · intermedio', 5: '5 · experto' };

export function Nivel({ nivel }: { nivel: number }) {
  return (
    <span role="img" aria-label={`Nivel ${nivel} de 5`} className="flex gap-1">
      {NIVELES.map((punto) => (
        <span key={punto} className={`size-2 rounded-full ${punto <= nivel ? 'bg-marca' : 'bg-borde'}`} />
      ))}
    </span>
  );
}

export function BotonEditar({ seccion, editando, alCambiar }: { seccion: string; editando: boolean; alCambiar: () => void }) {
  return (
    <button
      type="button"
      className={clasesBotonTexto}
      aria-label={editando ? `Terminar de editar ${seccion}` : `Editar ${seccion}`}
      onClick={alCambiar}
    >
      {editando ? 'Listo' : 'Editar'}
    </button>
  );
}

/** Errores que no pertenecen a ningún campo del formulario, como un 404. */
export const errorSinCampo = (error: unknown, campos: string[]) =>
  error instanceof ErrorApi && error.campos.some((c) => campos.includes(c.campo)) ? null : error;

// ---------- Habilidades ----------

function FilaHabilidad({ usuarioId, habilidad }: { usuarioId: string; habilidad: Perfil['habilidades'][number] }) {
  const poner = usePonerHabilidad(usuarioId);
  const quitar = useQuitarHabilidad(usuarioId);
  const { ejecutar, error, ocupado } = useAccion();
  // Local para que el selector no vuelva al valor viejo mientras llega la respuesta.
  const [nivel, setNivel] = useState(habilidad.nivel);
  useEffect(() => setNivel(habilidad.nivel), [habilidad.nivel]);

  const cambiarNivel = (nuevo: number) => {
    setNivel(nuevo);
    void ejecutar(async () => {
      try {
        await poner.mutateAsync({ habilidadId: habilidad.id, nivel: nuevo });
      } catch (fallo) {
        setNivel(habilidad.nivel);
        throw fallo;
      }
    });
  };

  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{habilidad.nombre}</span>
        <span className="flex items-center gap-3">
          <select
            aria-label={`Nivel de ${habilidad.nombre}`}
            className="rounded-md border border-borde bg-tarjeta px-1.5 py-1 text-sm"
            value={nivel}
            disabled={ocupado}
            onChange={(evento) => cambiarNivel(Number(evento.target.value))}
          >
            {NIVELES.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={clasesBotonTexto}
            aria-label={`Quitar ${habilidad.nombre}`}
            disabled={ocupado}
            onClick={() => void ejecutar(() => quitar.mutateAsync(habilidad.id))}
          >
            Quitar
          </button>
        </span>
      </div>
      <TextoDeError error={error} />
    </li>
  );
}

export function porCategoria(habilidades: Habilidad[]) {
  const grupos = new Map<string, Habilidad[]>();
  for (const habilidad of habilidades) {
    grupos.set(habilidad.categoria, [...(grupos.get(habilidad.categoria) ?? []), habilidad]);
  }
  return [...grupos];
}

function AgregarHabilidad({ usuarioId, propias }: { usuarioId: string; propias: Set<string> }) {
  const catalogo = useHabilidades();
  const poner = usePonerHabilidad(usuarioId);
  const { ejecutar, error, ocupado } = useAccion();
  const [habilidadId, setHabilidadId] = useState('');
  const [nivel, setNivel] = useState(3);
  const [sinElegir, setSinElegir] = useState(false);

  const disponibles = catalogo.data?.datos.filter((h) => !propias.has(h.id)) ?? [];

  // La habilidad va en la URL, no en el cuerpo: el backend no puede decir que falta.
  const agregar = (evento: FormEvent) => {
    evento.preventDefault();
    setSinElegir(!habilidadId);
    if (!habilidadId) return;
    void ejecutar(async () => {
      await poner.mutateAsync({ habilidadId, nivel });
      setHabilidadId('');
    });
  };

  return (
    <form noValidate onSubmit={agregar} className="flex flex-col gap-2 border-t border-borde pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Campo etiqueta="Habilidad nueva" error={sinElegir ? 'Elige una habilidad' : undefined}>
            {(control) => (
              <select
                {...control}
                className={clasesControl}
                value={habilidadId}
                onChange={(e) => setHabilidadId(e.target.value)}
              >
                <option value="">Elige una habilidad</option>
                {porCategoria(disponibles).map(([categoria, habilidades]) => (
                  <optgroup key={categoria} label={categoria}>
                    {habilidades.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.nombre}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </Campo>
        </div>
        <Campo etiqueta="Nivel">
          {(control) => (
            <select {...control} className={clasesControl} value={nivel} onChange={(e) => setNivel(Number(e.target.value))}>
              {NIVELES.map((valor) => (
                <option key={valor} value={valor}>
                  {NOMBRE_NIVEL[valor] ?? valor}
                </option>
              ))}
            </select>
          )}
        </Campo>
        <Boton type="submit" variante="primario" disabled={ocupado}>
          Agregar
        </Boton>
      </div>
      <TextoDeError error={error ?? catalogo.error} />
    </form>
  );
}

export function SeccionHabilidades({ usuario }: { usuario: Perfil }) {
  const [editando, setEditando] = useState(false);

  return (
    <Tarjeta
      titulo="Habilidades"
      accion={<BotonEditar seccion="habilidades" editando={editando} alCambiar={() => setEditando(!editando)} />}
    >
      {usuario.habilidades.length === 0 && <p className="text-sm text-suave">Sin habilidades registradas.</p>}
      <ul className="flex flex-col gap-2">
        {usuario.habilidades.map((habilidad) =>
          editando ? (
            <FilaHabilidad key={habilidad.id} usuarioId={usuario.id} habilidad={habilidad} />
          ) : (
            <li key={habilidad.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{habilidad.nombre}</span>
              <Nivel nivel={habilidad.nivel} />
            </li>
          ),
        )}
      </ul>
      {editando && (
        <AgregarHabilidad usuarioId={usuario.id} propias={new Set(usuario.habilidades.map((h) => h.id))} />
      )}
    </Tarjeta>
  );
}

// ---------- Empleos ----------

export function BotonQuitar({ etiqueta, alQuitar }: { etiqueta: string; alQuitar: () => Promise<unknown> }) {
  const { ejecutar, error, ocupado } = useAccion();
  return (
    <span className="flex flex-col items-end gap-1">
      <button
        type="button"
        className={clasesBotonTexto}
        aria-label={etiqueta}
        disabled={ocupado}
        onClick={() => void ejecutar(alQuitar)}
      >
        Quitar
      </button>
      <TextoDeError error={error} />
    </span>
  );
}

function AgregarEmpleo({ usuarioId, propias }: { usuarioId: string; propias: Set<string> }) {
  const empresas = useEmpresas();
  const poner = usePonerEmpleo(usuarioId);
  const { ejecutar, error, ocupado } = useAccion();
  const [empresaId, setEmpresaId] = useState('');
  const [cargo, setCargo] = useState('');
  const [desde, setDesde] = useState('');
  const [actual, setActual] = useState(true);
  const [sinElegir, setSinElegir] = useState(false);

  const agregar = (evento: FormEvent) => {
    evento.preventDefault();
    setSinElegir(!empresaId);
    if (!empresaId) return;
    void ejecutar(async () => {
      await poner.mutateAsync({ empresaId, cargo, desde, actual });
      setEmpresaId('');
      setCargo('');
      setDesde('');
      setActual(true);
    });
  };

  return (
    <form noValidate onSubmit={agregar} className="flex flex-col gap-3 border-t border-borde pt-3">
      <Campo etiqueta="Empresa" error={sinElegir ? 'Elige una empresa' : undefined}>
        {(control) => (
          <select {...control} className={clasesControl} value={empresaId} onChange={(e) => setEmpresaId(e.target.value)}>
            <option value="">Elige una empresa</option>
            {empresas.data?.datos
              .filter((e) => !propias.has(e.id))
              .map((empresa) => (
                <option key={empresa.id} value={empresa.id}>
                  {empresa.nombre}
                </option>
              ))}
          </select>
        )}
      </Campo>
      <div className="flex flex-wrap gap-3">
        <div className="min-w-40 flex-1">
          <Campo etiqueta="Cargo" error={errorDeCampo(error, 'cargo')}>
            {(control) => (
              <input
                {...control}
                className={clasesControl}
                maxLength={120}
                value={cargo}
                onChange={(e) => setCargo(e.target.value)}
              />
            )}
          </Campo>
        </div>
        <Campo etiqueta="Desde" error={errorDeCampo(error, 'desde')}>
          {(control) => (
            <input {...control} type="date" className={clasesControl} value={desde} onChange={(e) => setDesde(e.target.value)} />
          )}
        </Campo>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" className="size-4 accent-marca" checked={actual} onChange={(e) => setActual(e.target.checked)} />
          Trabaja ahí actualmente
        </label>
        <Boton type="submit" variante="primario" disabled={ocupado}>
          Agregar empleo
        </Boton>
      </div>
      <TextoDeError error={errorSinCampo(error, ['cargo', 'desde']) ?? empresas.error} />
    </form>
  );
}

export function SeccionEmpleos({ usuario }: { usuario: Perfil }) {
  const [editando, setEditando] = useState(false);
  const quitar = useQuitarEmpleo(usuario.id);

  return (
    <Tarjeta
      titulo="Empleos"
      accion={<BotonEditar seccion="empleos" editando={editando} alCambiar={() => setEditando(!editando)} />}
    >
      {usuario.empleos.length === 0 && <p className="text-sm text-suave">Sin empleos registrados.</p>}
      <ul className="flex flex-col gap-3">
        {usuario.empleos.map((empleo) => (
          <li key={empleo.id} className="flex items-start justify-between gap-3 text-sm">
            <span>
              <span className="block font-semibold">{empleo.cargo}</span>
              <span className="block text-suave">
                <Link to={`/empresas/${empleo.id}`} className="hover:underline">
                  {empleo.nombre}
                </Link>{' '}
                · desde {mesYAnio(empleo.desde)}
                {empleo.actual ? ' · actual' : ''}
              </span>
            </span>
            {editando && (
              <BotonQuitar etiqueta={`Quitar empleo en ${empleo.nombre}`} alQuitar={() => quitar.mutateAsync(empleo.id)} />
            )}
          </li>
        ))}
      </ul>
      {editando && <AgregarEmpleo usuarioId={usuario.id} propias={new Set(usuario.empleos.map((e) => e.id))} />}
    </Tarjeta>
  );
}

// ---------- Proyectos ----------

function AgregarProyecto({ usuarioId, propios }: { usuarioId: string; propios: Set<string> }) {
  const proyectos = useProyectos();
  const poner = usePonerParticipacion(usuarioId);
  const { ejecutar, error, ocupado } = useAccion();
  const [proyectoId, setProyectoId] = useState('');
  const [rol, setRol] = useState('');
  const [sinElegir, setSinElegir] = useState(false);

  const agregar = (evento: FormEvent) => {
    evento.preventDefault();
    setSinElegir(!proyectoId);
    if (!proyectoId) return;
    void ejecutar(async () => {
      await poner.mutateAsync({ proyectoId, rol });
      setProyectoId('');
      setRol('');
    });
  };

  return (
    <form noValidate onSubmit={agregar} className="flex flex-col gap-3 border-t border-borde pt-3">
      <Campo etiqueta="Proyecto" error={sinElegir ? 'Elige un proyecto' : undefined}>
        {(control) => (
          <select {...control} className={clasesControl} value={proyectoId} onChange={(e) => setProyectoId(e.target.value)}>
            <option value="">Elige un proyecto</option>
            {proyectos.data?.datos
              .filter((p) => !propios.has(p.id))
              .map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </option>
              ))}
          </select>
        )}
      </Campo>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 flex-1">
          <Campo etiqueta="Rol" error={errorDeCampo(error, 'rol')}>
            {(control) => (
              <input
                {...control}
                className={clasesControl}
                maxLength={60}
                placeholder="Ej.: Backend"
                value={rol}
                onChange={(e) => setRol(e.target.value)}
              />
            )}
          </Campo>
        </div>
        <Boton type="submit" variante="primario" disabled={ocupado}>
          Agregar proyecto
        </Boton>
      </div>
      <TextoDeError error={errorSinCampo(error, ['rol']) ?? proyectos.error} />
    </form>
  );
}

export function SeccionProyectos({ usuario }: { usuario: Perfil }) {
  const [editando, setEditando] = useState(false);
  const quitar = useQuitarParticipacion(usuario.id);

  return (
    <Tarjeta
      titulo="Proyectos"
      accion={<BotonEditar seccion="proyectos" editando={editando} alCambiar={() => setEditando(!editando)} />}
    >
      {usuario.proyectos.length === 0 && <p className="text-sm text-suave">Sin proyectos registrados.</p>}
      <ul className="flex flex-col gap-3">
        {usuario.proyectos.map((proyecto) => (
          <li key={proyecto.id} className="flex items-start justify-between gap-3 text-sm">
            <span>
              <Link to={`/proyectos/${proyecto.id}`} className="block font-semibold hover:underline">
                {proyecto.nombre}
              </Link>
              <span className="block text-suave">
                {proyecto.rol} · {proyecto.estado}
              </span>
            </span>
            {editando && (
              <BotonQuitar
                etiqueta={`Quitar proyecto ${proyecto.nombre}`}
                alQuitar={() => quitar.mutateAsync(proyecto.id)}
              />
            )}
          </li>
        ))}
      </ul>
      {editando && <AgregarProyecto usuarioId={usuario.id} propios={new Set(usuario.proyectos.map((p) => p.id))} />}
    </Tarjeta>
  );
}
