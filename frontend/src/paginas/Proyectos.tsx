import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { errorDeCampo } from '../api/cliente';
import { useHabilidades } from '../api/catalogos';
import { useEmpresas } from '../api/oportunidades';
import {
  ESTADOS_PROYECTO,
  useActualizarProyecto,
  useColaboradores,
  useCrearProyecto,
  useEliminarProyecto,
  useListaProyectos,
  usePonerMiembro,
  usePonerTecnologia,
  useProyecto,
  useProyectosRelacionados,
  useQuitarMiembro,
  useQuitarTecnologia,
  type DatosProyecto,
  type DetalleProyecto,
  type ParRelacionado,
} from '../api/proyectos';
import type { Usuario } from '../api/usuarios';
import { ComboPersona } from '../componentes/ComboPersona';
import { ConfirmarEliminar, Detalle, Encabezado } from '../componentes/Detalle';
import { FormularioSimple, type DefinicionCampo } from '../componentes/FormularioSimple';
import { EncabezadoLista, TarjetaEnlace, ultimaPagina, usePaginaEnUrl, useTopeDePagina } from '../componentes/Listas';
import { Paginacion } from '../componentes/Paginacion';
import { BotonEditar, BotonQuitar, errorSinCampo, porCategoria } from '../componentes/perfil/Vinculos';
import {
  Boton,
  Campo,
  Cargando,
  clasesBoton,
  clasesBotonTexto,
  clasesControl,
  Insignia,
  MensajeError,
  Tarjeta,
  TextoDeError,
  Vacio,
} from '../componentes/ui';
import { listaLegible, soloCambios, useAccion } from '../utiles';

const POR_PAGINA = 12;

// ---------- Lista ----------

function razonesDelPar(par: ParRelacionado) {
  return [
    par.tecnologias.length > 0 && `Tecnologías en común: ${listaLegible(par.tecnologias)}`,
    par.miembrosEnComun.length > 0 && `Miembros en ambos: ${listaLegible(par.miembrosEnComun)}`,
    par.miembrosConectados.length > 0 &&
      `Miembros conectados: ${listaLegible(par.miembrosConectados.map((p) => p.replace(' - ', ' con ')))}`,
  ].filter((razon) => razon !== false);
}

function Relacionados() {
  const { data, error, isPending, refetch } = useProyectosRelacionados();

  return (
    <Tarjeta titulo="Proyectos relacionados">
      <p className="-mt-2 text-xs text-suave">
        Las 10 parejas que más comparten: tecnologías, miembros, o miembros conectados entre sí.
      </p>
      {error && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      <ul className="flex flex-col gap-3">
        {data?.datos.map((par) => (
          <li key={`${par.id1}-${par.id2}`} className="flex flex-col gap-1 border-t border-borde pt-3 text-sm first:border-0 first:pt-0">
            <span className="font-semibold">
              <Link to={`/proyectos/${par.id1}`} className="hover:underline">
                {par.proyecto1}
              </Link>{' '}
              <span className="font-normal text-suave">y</span>{' '}
              <Link to={`/proyectos/${par.id2}`} className="hover:underline">
                {par.proyecto2}
              </Link>
            </span>
            <ul className="flex flex-col gap-0.5 text-xs text-suave">
              {razonesDelPar(par).map((razon) => (
                <li key={razon}>{razon}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

export function ListaProyectos() {
  const { pagina, irA } = usePaginaEnUrl();
  const { data, error, isPending, isPlaceholderData, refetch } = useListaProyectos(pagina, POR_PAGINA);
  const ultima = ultimaPagina(data?.total, POR_PAGINA);
  const fuera = useTopeDePagina(pagina, ultima, Boolean(data) && !isPlaceholderData, irA);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoLista
        titulo="Proyectos"
        total={data?.total}
        singular="proyecto"
        varias="proyectos"
        rutaNueva="/proyectos/nuevo"
        textoNueva="Nuevo proyecto"
      />
      {error && !data && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      {data?.datos.length === 0 && !fuera && <Vacio>Todavía no hay proyectos.</Vacio>}
      <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
        {data?.datos.map((proyecto) => (
          <TarjetaEnlace key={proyecto.id} ruta={`/proyectos/${proyecto.id}`} titulo={proyecto.nombre}>
            <span className="text-sm text-suave">{proyecto.empresa?.nombre ?? 'Comunitario'}</span>
            <span className="mt-1">
              <Insignia tenue={proyecto.estado !== 'en curso'}>{proyecto.estado}</Insignia>
            </span>
          </TarjetaEnlace>
        ))}
      </ul>
      <Paginacion pagina={pagina} ultima={ultima} alCambiar={irA} />
      <Relacionados />
    </div>
  );
}

// ---------- Tecnologías ----------

function Tecnologias({ proyecto }: { proyecto: DetalleProyecto }) {
  const [editando, setEditando] = useState(false);
  const catalogo = useHabilidades();
  const poner = usePonerTecnologia(proyecto.id);
  const quitar = useQuitarTecnologia(proyecto.id);
  const { ejecutar, error, ocupado } = useAccion();
  const [habilidadId, setHabilidadId] = useState('');
  const [sinElegir, setSinElegir] = useState(false);
  const actuales = new Set(proyecto.tecnologias.map((t) => t.id));

  const agregar = (evento: FormEvent) => {
    evento.preventDefault();
    setSinElegir(!habilidadId);
    if (!habilidadId) return;
    void ejecutar(async () => {
      await poner.mutateAsync(habilidadId);
      setHabilidadId('');
    });
  };

  return (
    <Tarjeta
      titulo="Tecnologías"
      accion={<BotonEditar seccion="tecnologías" editando={editando} alCambiar={() => setEditando(!editando)} />}
    >
      {proyecto.tecnologias.length === 0 && <p className="text-sm text-suave">Sin tecnologías registradas.</p>}
      <ul className="flex flex-wrap gap-2">
        {proyecto.tecnologias.map((tecnologia) => (
          <li key={tecnologia.id} className="flex items-center gap-2 rounded-full border border-borde px-3 py-1 text-sm">
            {tecnologia.nombre}
            {editando && (
              <BotonQuitar etiqueta={`Quitar ${tecnologia.nombre}`} alQuitar={() => quitar.mutateAsync(tecnologia.id)} />
            )}
          </li>
        ))}
      </ul>
      {editando && (
        <form noValidate onSubmit={agregar} className="flex flex-col gap-2 border-t border-borde pt-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-40 flex-1">
              <Campo etiqueta="Tecnología nueva" error={sinElegir ? 'Elige una tecnología' : undefined}>
                {(control) => (
                  <select {...control} className={clasesControl} value={habilidadId} onChange={(e) => setHabilidadId(e.target.value)}>
                    <option value="">Elige una tecnología</option>
                    {porCategoria(catalogo.data?.datos.filter((h) => !actuales.has(h.id)) ?? []).map(([categoria, lista]) => (
                      <optgroup key={categoria} label={categoria}>
                        {lista.map((h) => (
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
            <Boton type="submit" variante="primario" disabled={ocupado}>
              Agregar
            </Boton>
          </div>
          <TextoDeError error={error ?? catalogo.error} />
        </form>
      )}
    </Tarjeta>
  );
}

// ---------- Miembros ----------

function AgregarMiembro({ proyecto }: { proyecto: DetalleProyecto }) {
  const poner = usePonerMiembro(proyecto.id);
  const { ejecutar, error, ocupado } = useAccion();
  const [persona, setPersona] = useState<Usuario | null>(null);
  const [rol, setRol] = useState('');
  const [sinElegir, setSinElegir] = useState(false);

  const agregar = (evento: FormEvent) => {
    evento.preventDefault();
    setSinElegir(!persona);
    if (!persona) return;
    void ejecutar(async () => {
      await poner.mutateAsync({ usuarioId: persona.id, rol });
      setPersona(null);
      setRol('');
    });
  };

  return (
    <form noValidate onSubmit={agregar} className="flex flex-col gap-3 border-t border-borde pt-3">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-semibold">Persona</span>
        {persona ? (
          <span className="flex items-center gap-3 text-sm">
            <span className="font-semibold">{persona.nombre}</span>
            <button type="button" className={clasesBotonTexto} onClick={() => setPersona(null)}>
              Cambiar
            </button>
          </span>
        ) : (
          <ComboPersona etiqueta="Buscar persona" alElegir={setPersona} />
        )}
        {sinElegir && <p className="text-sm text-peligro">Elige una persona</p>}
      </div>
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
          Agregar miembro
        </Boton>
      </div>
      <TextoDeError error={errorSinCampo(error, ['rol'])} />
    </form>
  );
}

function Miembros({ proyecto }: { proyecto: DetalleProyecto }) {
  const [editando, setEditando] = useState(false);
  const quitar = useQuitarMiembro(proyecto.id);

  return (
    <Tarjeta
      titulo={`Miembros (${proyecto.miembros.length})`}
      accion={<BotonEditar seccion="miembros" editando={editando} alCambiar={() => setEditando(!editando)} />}
    >
      {proyecto.miembros.length === 0 && <p className="text-sm text-suave">Nadie participa todavía.</p>}
      <ul className="flex flex-col gap-3">
        {proyecto.miembros.map((miembro) => (
          <li key={miembro.id} className="flex items-start justify-between gap-3 text-sm">
            <span>
              <Link to={`/personas/${miembro.id}`} className="block font-semibold hover:underline">
                {miembro.nombre}
              </Link>
              <span className="block text-xs text-suave">{miembro.rol}</span>
            </span>
            {editando && (
              <BotonQuitar etiqueta={`Quitar a ${miembro.nombre}`} alQuitar={() => quitar.mutateAsync(miembro.id)} />
            )}
          </li>
        ))}
      </ul>
      {editando && <AgregarMiembro proyecto={proyecto} />}
    </Tarjeta>
  );
}

function Colaboradores({ proyecto }: { proyecto: DetalleProyecto }) {
  const { data, error, isPending, refetch } = useColaboradores(proyecto.id);

  return (
    <Tarjeta titulo="Colaboradores sugeridos">
      <p className="-mt-2 text-xs text-suave">70 % tecnologías que domina y 30 % contactos en el equipo.</p>
      {error && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      {data?.datos.length === 0 && (
        <p className="text-sm text-suave">
          {proyecto.estado === 'en curso' ? 'Nadie más domina sus tecnologías.' : 'El proyecto terminó: ya no busca colaboradores.'}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {data?.datos.map((colaborador) => (
          <li key={colaborador.id} className="flex flex-col gap-1 border-t border-borde pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <Link to={`/personas/${colaborador.id}`} className="text-sm font-semibold hover:underline">
                {colaborador.colaborador}
              </Link>
              <span className="shrink-0 text-sm tabular-nums">ajuste {colaborador.puntaje} %</span>
            </div>
            <ul className="flex flex-col gap-0.5 text-xs text-suave">
              <li>Aporta {listaLegible(colaborador.habilidadesUtiles)}</li>
              {colaborador.contactosEnProyecto.length > 0 && (
                <li>Conoce a {listaLegible(colaborador.contactosEnProyecto)} del equipo</li>
              )}
            </ul>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

// ---------- Detalle ----------

function ContenidoProyecto({ proyecto }: { proyecto: DetalleProyecto }) {
  const navegar = useNavigate();
  const eliminar = useEliminarProyecto();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <Encabezado
        titulo={proyecto.nombre}
        subtitulo={
          <>
            {proyecto.empresa ? (
              <Link to={`/empresas/${proyecto.empresa.id}`} className="font-semibold text-tinta hover:underline">
                {proyecto.empresa.nombre}
              </Link>
            ) : (
              <span>Comunitario</span>
            )}
            <Insignia tenue={proyecto.estado !== 'en curso'}>{proyecto.estado}</Insignia>
          </>
        }
        acciones={
          <>
            <Link to={`/proyectos/${proyecto.id}/editar`} className={clasesBoton.secundario}>
              Editar
            </Link>
            <Boton variante="peligroSuave" onClick={() => setConfirmando(true)}>
              Eliminar
            </Boton>
          </>
        }
      />
      {proyecto.descripcion && <p className="max-w-2xl text-sm">{proyecto.descripcion}</p>}

      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Tecnologias proyecto={proyecto} />
          <Miembros proyecto={proyecto} />
        </div>
        <Colaboradores proyecto={proyecto} />
      </div>

      <ConfirmarEliminar
        abierto={confirmando}
        titulo={`¿Eliminar ${proyecto.nombre}?`}
        detalle="Se borran sus tecnologías y participaciones. Las personas siguen en la red."
        alCerrar={() => setConfirmando(false)}
        alConfirmar={async () => {
          await eliminar.mutateAsync(proyecto.id);
          await navegar('/proyectos');
        }}
      />
    </div>
  );
}

export function DetalleProyecto() {
  const { id = '' } = useParams();
  return (
    <Detalle consulta={useProyecto(id)} queNoExiste="Este proyecto no existe." rutaVolver="/proyectos" textoVolver="Volver a proyectos">
      {(proyecto) => <ContenidoProyecto proyecto={proyecto} />}
    </Detalle>
  );
}

// ---------- Formularios ----------

const CAMPOS_BASE: DefinicionCampo[] = [
  { nombre: 'nombre', etiqueta: 'Nombre', maximo: 150 },
  { nombre: 'descripcion', etiqueta: 'Descripción', tipo: 'area', maximo: 500 },
  {
    nombre: 'estado',
    etiqueta: 'Estado',
    tipo: 'opciones',
    opciones: ESTADOS_PROYECTO.map((valor) => ({ valor, texto: valor })),
  },
];

export function NuevoProyecto() {
  const navegar = useNavigate();
  const crear = useCrearProyecto();
  const empresas = useEmpresas();

  if (!empresas.data) {
    return empresas.error ? <MensajeError error={empresas.error} /> : <Cargando />;
  }

  return (
    <FormularioSimple
      titulo="Nuevo proyecto"
      campos={[
        ...CAMPOS_BASE,
        {
          nombre: 'empresaId',
          etiqueta: 'Empresa',
          tipo: 'opciones',
          opciones: [
            { valor: '', texto: 'Ninguna: proyecto comunitario' },
            ...empresas.data.datos.map((e) => ({ valor: e.id, texto: e.nombre })),
          ],
        },
      ]}
      inicial={{ nombre: '', descripcion: '', estado: ESTADOS_PROYECTO[0] ?? '', empresaId: '' }}
      textoGuardar="Crear proyecto"
      rutaCancelar="/proyectos"
      alGuardar={async (valores) => {
        const creado = await crear.mutateAsync(valores as unknown as DatosProyecto);
        await navegar(`/proyectos/${creado.id}`, { replace: true });
      }}
    />
  );
}

export function EditarProyecto() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const actualizar = useActualizarProyecto(id);

  return (
    <Detalle consulta={useProyecto(id)} queNoExiste="Este proyecto no existe." rutaVolver="/proyectos" textoVolver="Volver a proyectos">
      {(proyecto) => {
        const inicial = { nombre: proyecto.nombre, descripcion: proyecto.descripcion, estado: proyecto.estado };
        return (
          <FormularioSimple
            key={proyecto.id}
            titulo={`Editar ${proyecto.nombre}`}
            campos={CAMPOS_BASE}
            inicial={inicial}
            textoGuardar="Guardar cambios"
            rutaCancelar={`/proyectos/${id}`}
            alGuardar={async (valores) => {
              const cambios = soloCambios(inicial, valores as typeof inicial);
              if (Object.keys(cambios).length > 0) await actualizar.mutateAsync(cambios);
              await navegar(`/proyectos/${id}`);
            }}
          />
        );
      }}
    </Detalle>
  );
}
