import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { useCiudades, useHabilidades } from '../api/catalogos';
import { useEmpresas } from '../api/oportunidades';
import {
  ESTADOS_POSTULACION,
  MODALIDADES,
  NIVELES_OFERTA,
  useActualizarOferta,
  useCambiarPostulacion,
  useCandidatos,
  useCrearOferta,
  useEliminarOferta,
  useListaOfertas,
  useOferta,
  usePonerRequisito,
  usePostulantes,
  useQuitarRequisito,
  type Candidato,
  type DatosOferta,
  type DetalleOferta,
  type Postulante,
  type Requisito,
} from '../api/ofertas';
import { usePostularse } from '../api/recomendaciones';
import type { Ciudad } from '../api/usuarios';
import { ConfirmarEliminar, Detalle, Encabezado } from '../componentes/Detalle';
import { FormularioSimple, type DefinicionCampo } from '../componentes/FormularioSimple';
import { EncabezadoLista, TarjetaEnlace, ultimaPagina, usePaginaEnUrl, useTopeDePagina } from '../componentes/Listas';
import { Paginacion } from '../componentes/Paginacion';
import { BotonEditar, BotonQuitar, NIVELES, NOMBRE_NIVEL, porCategoria } from '../componentes/perfil/Vinculos';
import {
  Avatar,
  Boton,
  Campo,
  Cargando,
  clasesBoton,
  clasesControl,
  Insignia,
  MensajeError,
  Tarjeta,
  TextoDeError,
  Vacio,
} from '../componentes/ui';
import { useUsuarioActual } from '../contexto/UsuarioActual';
import { diaMesAnio, listaLegible, soloCambios, useAccion } from '../utiles';

const POR_PAGINA = 12;

const FILTROS = [
  { valor: 'abierta', texto: 'Abiertas' },
  { valor: 'cerrada', texto: 'Cerradas' },
  { valor: 'todas', texto: 'Todas' },
];

// ---------- Lista ----------

export function ListaOfertas() {
  const { pagina, irA, parametros, setParametros } = usePaginaEnUrl();
  const filtro = FILTROS.some((f) => f.valor === parametros.get('estado')) ? parametros.get('estado')! : 'abierta';
  const { data, error, isPending, isPlaceholderData, refetch } = useListaOfertas(
    filtro === 'todas' ? null : filtro,
    pagina,
    POR_PAGINA,
  );
  const ultima = ultimaPagina(data?.total, POR_PAGINA);
  const fuera = useTopeDePagina(pagina, ultima, Boolean(data) && !isPlaceholderData, irA);

  const filtrar = (valor: string) => {
    const nuevos = new URLSearchParams();
    if (valor !== 'abierta') nuevos.set('estado', valor);
    setParametros(nuevos);
  };

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoLista
        titulo="Ofertas"
        total={data?.total}
        singular="oferta"
        varias="ofertas"
        rutaNueva="/ofertas/nueva"
        textoNueva="Nueva oferta"
      >
        <div role="group" aria-label="Estado" className="flex gap-1">
          {FILTROS.map((opcion) => (
            <Boton
              key={opcion.valor}
              variante={filtro === opcion.valor ? 'primario' : 'secundario'}
              aria-pressed={filtro === opcion.valor}
              onClick={() => filtrar(opcion.valor)}
            >
              {opcion.texto}
            </Boton>
          ))}
        </div>
      </EncabezadoLista>
      {error && !data && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      {data?.datos.length === 0 && !fuera && <Vacio>No hay ofertas con ese estado.</Vacio>}
      <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
        {data?.datos.map((oferta) => (
          <TarjetaEnlace key={oferta.id} ruta={`/ofertas/${oferta.id}`} titulo={oferta.titulo}>
            <span className="text-sm text-suave">
              {oferta.empresa.nombre} · {oferta.ciudad.nombre}
            </span>
            <span className="text-xs text-suave">
              {oferta.modalidad} · {oferta.nivel} · {diaMesAnio(oferta.publicadaEn)}
            </span>
            {oferta.estado !== 'abierta' && (
              <span className="mt-1">
                <Insignia tenue>{oferta.estado}</Insignia>
              </span>
            )}
          </TarjetaEnlace>
        ))}
      </ul>
      <Paginacion pagina={pagina} ultima={ultima} alCambiar={irA} />
    </div>
  );
}

// ---------- Requisitos ----------

function FilaRequisito({ ofertaId, requisito }: { ofertaId: string; requisito: Requisito }) {
  const poner = usePonerRequisito(ofertaId);
  const quitar = useQuitarRequisito(ofertaId);
  const { ejecutar, error, ocupado } = useAccion();
  const [nivel, setNivel] = useState(requisito.nivelMinimo);
  const [obligatoria, setObligatoria] = useState(requisito.obligatoria);
  useEffect(() => setNivel(requisito.nivelMinimo), [requisito.nivelMinimo]);
  useEffect(() => setObligatoria(requisito.obligatoria), [requisito.obligatoria]);

  // Un PUT lleva el requisito completo: cambiar una parte reenvía también la otra.
  const guardar = (cambio: { nivelMinimo?: number; obligatoria?: boolean }) => {
    const siguiente = { nivelMinimo: nivel, obligatoria, ...cambio };
    setNivel(siguiente.nivelMinimo);
    setObligatoria(siguiente.obligatoria);
    void ejecutar(async () => {
      try {
        await poner.mutateAsync({ habilidadId: requisito.id, ...siguiente });
      } catch (fallo) {
        setNivel(requisito.nivelMinimo);
        setObligatoria(requisito.obligatoria);
        throw fallo;
      }
    });
  };

  return (
    <li className="flex flex-col gap-1 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span>{requisito.nombre}</span>
        <span className="flex items-center gap-3">
          <select
            aria-label={`Nivel mínimo de ${requisito.nombre}`}
            className="rounded-md border border-borde bg-tarjeta px-1.5 py-1 text-sm"
            value={nivel}
            disabled={ocupado}
            onChange={(e) => guardar({ nivelMinimo: Number(e.target.value) })}
          >
            {NIVELES.map((valor) => (
              <option key={valor} value={valor}>
                {valor}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs">
            <input
              type="checkbox"
              aria-label={`${requisito.nombre} es obligatoria`}
              className="size-4 accent-marca"
              checked={obligatoria}
              disabled={ocupado}
              onChange={(e) => guardar({ obligatoria: e.target.checked })}
            />
            Obligatoria
          </label>
          <BotonQuitar etiqueta={`Quitar ${requisito.nombre}`} alQuitar={() => quitar.mutateAsync(requisito.id)} />
        </span>
      </div>
      <TextoDeError error={error} />
    </li>
  );
}

function AgregarRequisito({ ofertaId, actuales }: { ofertaId: string; actuales: Set<string> }) {
  const catalogo = useHabilidades();
  const poner = usePonerRequisito(ofertaId);
  const { ejecutar, error, ocupado } = useAccion();
  const [habilidadId, setHabilidadId] = useState('');
  const [nivelMinimo, setNivelMinimo] = useState(3);
  const [obligatoria, setObligatoria] = useState(true);
  const [sinElegir, setSinElegir] = useState(false);

  const agregar = (evento: FormEvent) => {
    evento.preventDefault();
    setSinElegir(!habilidadId);
    if (!habilidadId) return;
    void ejecutar(async () => {
      await poner.mutateAsync({ habilidadId, nivelMinimo, obligatoria });
      setHabilidadId('');
    });
  };

  return (
    <form noValidate onSubmit={agregar} className="flex flex-col gap-2 border-t border-borde pt-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-40 flex-1">
          <Campo etiqueta="Habilidad requerida" error={sinElegir ? 'Elige una habilidad' : undefined}>
            {(control) => (
              <select {...control} className={clasesControl} value={habilidadId} onChange={(e) => setHabilidadId(e.target.value)}>
                <option value="">Elige una habilidad</option>
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
        <Campo etiqueta="Nivel mínimo">
          {(control) => (
            <select
              {...control}
              className={clasesControl}
              value={nivelMinimo}
              onChange={(e) => setNivelMinimo(Number(e.target.value))}
            >
              {NIVELES.map((valor) => (
                <option key={valor} value={valor}>
                  {NOMBRE_NIVEL[valor] ?? valor}
                </option>
              ))}
            </select>
          )}
        </Campo>
      </div>
      <div className="flex items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-marca"
            checked={obligatoria}
            onChange={(e) => setObligatoria(e.target.checked)}
          />
          Es obligatoria
        </label>
        <Boton type="submit" variante="primario" disabled={ocupado}>
          Agregar requisito
        </Boton>
      </div>
      <TextoDeError error={error ?? catalogo.error} />
    </form>
  );
}

function Requisitos({ oferta }: { oferta: DetalleOferta }) {
  const [editando, setEditando] = useState(false);

  return (
    <Tarjeta
      titulo="Requisitos"
      accion={<BotonEditar seccion="requisitos" editando={editando} alCambiar={() => setEditando(!editando)} />}
    >
      {oferta.habilidades.length === 0 && <p className="text-sm text-suave">Sin requisitos todavía.</p>}
      <ul className="flex flex-col gap-2">
        {oferta.habilidades.map((requisito) =>
          editando ? (
            <FilaRequisito key={requisito.id} ofertaId={oferta.id} requisito={requisito} />
          ) : (
            <li key={requisito.id} className="flex items-center justify-between gap-3 text-sm">
              <span>{requisito.nombre}</span>
              <span className="flex items-center gap-2 text-xs text-suave">
                nivel {requisito.nivelMinimo} o más
                {requisito.obligatoria ? <Insignia>obligatoria</Insignia> : <Insignia tenue>deseable</Insignia>}
              </span>
            </li>
          ),
        )}
      </ul>
      {editando && <AgregarRequisito ofertaId={oferta.id} actuales={new Set(oferta.habilidades.map((h) => h.id))} />}
    </Tarjeta>
  );
}

// ---------- Postulantes y candidatos ----------

function FilaPostulante({ ofertaId, postulante }: { ofertaId: string; postulante: Postulante }) {
  const cambiar = useCambiarPostulacion(ofertaId);
  const { ejecutar, error, ocupado } = useAccion();
  const [estado, setEstado] = useState(postulante.estado);
  useEffect(() => setEstado(postulante.estado), [postulante.estado]);

  const elegir = (nuevo: string) => {
    setEstado(nuevo);
    void ejecutar(async () => {
      try {
        await cambiar.mutateAsync({ usuarioId: postulante.id, estado: nuevo });
      } catch (fallo) {
        setEstado(postulante.estado);
        throw fallo;
      }
    });
  };

  return (
    <li className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2.5">
          <Avatar nombre={postulante.nombre} />
          <span className="min-w-0">
            <Link to={`/personas/${postulante.id}`} className="block truncate text-sm font-semibold hover:underline">
              {postulante.nombre}
            </Link>
            <span className="block text-xs text-suave">Se postuló el {diaMesAnio(postulante.fecha)}</span>
          </span>
        </span>
        <select
          aria-label={`Estado de ${postulante.nombre}`}
          className="rounded-md border border-borde bg-tarjeta px-2 py-1 text-sm"
          value={estado}
          disabled={ocupado}
          onChange={(e) => elegir(e.target.value)}
        >
          {ESTADOS_POSTULACION.map((opcion) => (
            <option key={opcion} value={opcion}>
              {opcion}
            </option>
          ))}
        </select>
      </div>
      <TextoDeError error={error} />
    </li>
  );
}

function Postulantes({ ofertaId }: { ofertaId: string }) {
  const { data, error, isPending, refetch } = usePostulantes(ofertaId);

  return (
    <Tarjeta titulo={data ? `Postulantes (${data.postulantes.length})` : 'Postulantes'}>
      {error && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      {data?.postulantes.length === 0 && <p className="text-sm text-suave">Nadie se ha postulado todavía.</p>}
      <ul className="flex flex-col gap-3">
        {data?.postulantes.map((postulante) => (
          <FilaPostulante key={postulante.id} ofertaId={ofertaId} postulante={postulante} />
        ))}
      </ul>
    </Tarjeta>
  );
}

function razonesDeCandidato(candidato: Candidato) {
  const deseables = candidato.faltan.filter((h) => !candidato.faltanObligatorias.includes(h));
  return [
    candidato.cumple.length > 0 && { texto: `Cumple: ${listaLegible(candidato.cumple)}` },
    candidato.faltanObligatorias.length > 0 && {
      texto: `Obligatorias que le faltan: ${listaLegible(candidato.faltanObligatorias)}`,
      alerta: true,
    },
    deseables.length > 0 && { texto: `Deseables que le faltan: ${listaLegible(deseables)}` },
    candidato.contactosEnEmpresa.length > 0 && { texto: `Conoce ahí a ${listaLegible(candidato.contactosEnEmpresa)}` },
    candidato.mismaCiudad && { texto: 'Vive en la ciudad de la oferta' },
  ].filter((razon) => razon !== false);
}

function Candidatos({ oferta }: { oferta: DetalleOferta }) {
  const { data, error, isPending, refetch } = useCandidatos(oferta.id);

  return (
    <Tarjeta titulo="Candidatos sugeridos">
      <p className="-mt-2 text-xs text-suave">
        60 % habilidades, 30 % contactos en la empresa y 10 % ciudad. Solo quien está abierto a ofertas y no se ha
        postulado.
      </p>
      {error && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      {data?.datos.length === 0 && (
        <p className="text-sm text-suave">
          {oferta.estado === 'abierta' ? 'Nadie tiene las habilidades que pide.' : 'La oferta está cerrada: ya no busca candidatos.'}
        </p>
      )}
      <ul className="flex flex-col gap-3">
        {data?.datos.map((candidato) => (
          <li key={candidato.id} className="flex flex-col gap-1 border-t border-borde pt-3 first:border-0 first:pt-0">
            <div className="flex items-center justify-between gap-3">
              <Link to={`/personas/${candidato.id}`} className="text-sm font-semibold hover:underline">
                {candidato.candidato}
              </Link>
              <span className="shrink-0 text-sm tabular-nums">ajuste {candidato.puntaje} %</span>
            </div>
            <ul className="flex flex-col gap-0.5 text-xs text-suave">
              {razonesDeCandidato(candidato).map((razon) => (
                <li key={razon.texto} className={razon.alerta ? 'font-semibold text-peligro' : ''}>
                  {razon.texto}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </Tarjeta>
  );
}

// ---------- Detalle ----------

function Postularme({ oferta }: { oferta: DetalleOferta }) {
  const { id: actual, usuario } = useUsuarioActual();
  const postulantes = usePostulantes(oferta.id);
  const postularse = usePostularse(actual ?? '');
  const { ejecutar, error, ocupado } = useAccion();

  if (oferta.estado !== 'abierta') return null;
  if (!actual) return <span className="text-sm text-suave">Elige a quién representar para postularte.</span>;
  if (!postulantes.data) return null;
  if (postulantes.data.postulantes.some((p) => p.id === actual)) {
    return <Insignia>{usuario?.nombre ?? 'Tú'} ya se postuló</Insignia>;
  }

  return (
    <span className="flex flex-col gap-1">
      <Boton variante="primario" disabled={ocupado} onClick={() => void ejecutar(() => postularse.mutateAsync(oferta.id))}>
        Postularme
      </Boton>
      <TextoDeError error={error} />
    </span>
  );
}

function ContenidoOferta({ oferta }: { oferta: DetalleOferta }) {
  const navegar = useNavigate();
  const actualizar = useActualizarOferta(oferta.id);
  const eliminar = useEliminarOferta();
  const { ejecutar, error, ocupado } = useAccion();
  const [confirmando, setConfirmando] = useState(false);
  const abierta = oferta.estado === 'abierta';

  return (
    <div className="flex flex-col gap-5">
      <Encabezado
        titulo={oferta.titulo}
        subtitulo={
          <>
            <Link to={`/empresas/${oferta.empresa.id}`} className="font-semibold text-tinta hover:underline">
              {oferta.empresa.nombre}
            </Link>
            <span>{oferta.ciudad.nombre}</span>
            <span>
              {oferta.modalidad} · {oferta.nivel}
            </span>
            <span>Publicada el {diaMesAnio(oferta.publicadaEn)}</span>
            <Insignia tenue={!abierta}>{oferta.estado}</Insignia>
          </>
        }
        acciones={
          <>
            <Postularme oferta={oferta} />
            <Boton
              disabled={ocupado}
              onClick={() => void ejecutar(() => actualizar.mutateAsync({ estado: abierta ? 'cerrada' : 'abierta' }))}
            >
              {abierta ? 'Cerrar oferta' : 'Reabrir oferta'}
            </Boton>
            <Link to={`/caminos?tipo=oferta&destino=${oferta.id}`} className={clasesBoton.secundario}>
              Camino hasta aquí
            </Link>
            <Link to={`/ofertas/${oferta.id}/editar`} className={clasesBoton.secundario}>
              Editar
            </Link>
            <Boton variante="peligroSuave" onClick={() => setConfirmando(true)}>
              Eliminar
            </Boton>
          </>
        }
      />
      <TextoDeError error={error} />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-4">
          <Requisitos oferta={oferta} />
          <Postulantes ofertaId={oferta.id} />
        </div>
        <Candidatos oferta={oferta} />
      </div>

      <ConfirmarEliminar
        abierto={confirmando}
        titulo={`¿Eliminar ${oferta.titulo}?`}
        detalle={`También se borran sus requisitos y ${oferta.totalPostulaciones === 1 ? 'la postulación' : `las ${oferta.totalPostulaciones} postulaciones`}. Para dejar de recibir postulaciones sin perderlas, ciérrala.`}
        alCerrar={() => setConfirmando(false)}
        alConfirmar={async () => {
          await eliminar.mutateAsync(oferta.id);
          await navegar('/ofertas');
        }}
      />
    </div>
  );
}

export function DetalleOferta() {
  const { id = '' } = useParams();
  return (
    <Detalle consulta={useOferta(id)} queNoExiste="Esta oferta no existe." rutaVolver="/ofertas" textoVolver="Volver a ofertas">
      {(oferta) => <ContenidoOferta oferta={oferta} />}
    </Detalle>
  );
}

// ---------- Formularios ----------

const opciones = (valores: string[]) => valores.map((valor) => ({ valor, texto: valor }));

function camposOferta(ciudades: Ciudad[], empresas: { id: string; nombre: string }[] | null): DefinicionCampo[] {
  return [
    { nombre: 'titulo', etiqueta: 'Título', maximo: 150 },
    ...(empresas
      ? [
          {
            nombre: 'empresaId',
            etiqueta: 'Empresa',
            tipo: 'opciones' as const,
            opciones: [{ valor: '', texto: 'Elige una empresa' }, ...empresas.map((e) => ({ valor: e.id, texto: e.nombre }))],
          },
        ]
      : []),
    {
      nombre: 'ciudadId',
      etiqueta: 'Ciudad',
      tipo: 'opciones',
      opciones: [{ valor: '', texto: 'Elige una ciudad' }, ...ciudades.map((c) => ({ valor: c.id, texto: c.nombre }))],
    },
    { nombre: 'nivel', etiqueta: 'Nivel', tipo: 'opciones', opciones: opciones(NIVELES_OFERTA) },
    { nombre: 'modalidad', etiqueta: 'Modalidad', tipo: 'opciones', opciones: opciones(MODALIDADES) },
  ];
}

export function NuevaOferta() {
  const navegar = useNavigate();
  const [parametros] = useSearchParams();
  const crear = useCrearOferta();
  const ciudades = useCiudades();
  const empresas = useEmpresas();
  const fallo = ciudades.error ?? empresas.error;

  if (!ciudades.data || !empresas.data) {
    return fallo ? <MensajeError error={fallo} /> : <Cargando />;
  }

  return (
    <FormularioSimple
      titulo="Nueva oferta"
      campos={camposOferta(ciudades.data.datos, empresas.data.datos)}
      inicial={{
        titulo: '',
        empresaId: parametros.get('empresa') ?? '',
        ciudadId: '',
        nivel: NIVELES_OFERTA[0] ?? '',
        modalidad: MODALIDADES[0] ?? '',
      }}
      textoGuardar="Publicar oferta"
      rutaCancelar="/ofertas"
      alGuardar={async (valores) => {
        const creada = await crear.mutateAsync(valores as unknown as DatosOferta);
        await navegar(`/ofertas/${creada.id}`, { replace: true });
      }}
    />
  );
}

export function EditarOferta() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const actualizar = useActualizarOferta(id);
  const ciudades = useCiudades();

  return (
    <Detalle consulta={useOferta(id)} queNoExiste="Esta oferta no existe." rutaVolver="/ofertas" textoVolver="Volver a ofertas">
      {(oferta) => {
        if (!ciudades.data) return <Cargando />;
        const inicial = {
          titulo: oferta.titulo,
          ciudadId: oferta.ciudad.id,
          nivel: oferta.nivel,
          modalidad: oferta.modalidad,
          estado: oferta.estado,
        };
        return (
          <FormularioSimple
            key={oferta.id}
            titulo={`Editar ${oferta.titulo}`}
            campos={[
              ...camposOferta(ciudades.data.datos, null),
              { nombre: 'estado', etiqueta: 'Estado', tipo: 'opciones', opciones: opciones(['abierta', 'cerrada']) },
            ]}
            inicial={inicial}
            textoGuardar="Guardar cambios"
            rutaCancelar={`/ofertas/${id}`}
            alGuardar={async (valores) => {
              const cambios = soloCambios(inicial, valores as typeof inicial);
              if (Object.keys(cambios).length > 0) await actualizar.mutateAsync(cambios);
              await navegar(`/ofertas/${id}`);
            }}
          />
        );
      }}
    </Detalle>
  );
}
