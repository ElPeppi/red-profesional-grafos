import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useCiudades } from '../api/catalogos';
import {
  useActualizarEmpresa,
  useCrearEmpresa,
  useEliminarEmpresa,
  useEmpresa,
  useListaEmpresas,
  type DatosEmpresa,
  type PerfilEmpresa,
} from '../api/empresas';
import type { Ciudad } from '../api/usuarios';
import { ConfirmarEliminar, Detalle, Encabezado } from '../componentes/Detalle';
import { FormularioSimple, type DefinicionCampo } from '../componentes/FormularioSimple';
import { EncabezadoLista, TarjetaEnlace, ultimaPagina, usePaginaEnUrl, useTopeDePagina } from '../componentes/Listas';
import { Paginacion } from '../componentes/Paginacion';
import { Boton, Cargando, clasesBoton, Insignia, MensajeError, Tarjeta, Vacio } from '../componentes/ui';
import { diaMesAnio, plural, soloCambios } from '../utiles';

const POR_PAGINA = 12;

export function ListaEmpresas() {
  const { pagina, irA } = usePaginaEnUrl();
  const { data, error, isPending, isPlaceholderData, refetch } = useListaEmpresas(pagina, POR_PAGINA);
  const ultima = ultimaPagina(data?.total, POR_PAGINA);
  const fuera = useTopeDePagina(pagina, ultima, Boolean(data) && !isPlaceholderData, irA);

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoLista
        titulo="Empresas"
        total={data?.total}
        singular="empresa"
        varias="empresas"
        rutaNueva="/empresas/nueva"
        textoNueva="Nueva empresa"
      />
      {error && !data && <MensajeError error={error} alReintentar={() => void refetch()} />}
      {isPending && !error && <Cargando />}
      {data?.datos.length === 0 && !fuera && <Vacio>Todavía no hay empresas.</Vacio>}
      <ul className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${isPlaceholderData ? 'opacity-60' : ''}`}>
        {data?.datos.map((empresa) => (
          <TarjetaEnlace key={empresa.id} ruta={`/empresas/${empresa.id}`} titulo={empresa.nombre}>
            <span className="text-sm text-suave">{empresa.sector}</span>
            <span className="text-xs text-suave">{empresa.ciudad.nombre}</span>
          </TarjetaEnlace>
        ))}
      </ul>
      <Paginacion pagina={pagina} ultima={ultima} alCambiar={irA} />
    </div>
  );
}

function ContenidoEmpresa({ empresa }: { empresa: PerfilEmpresa }) {
  const navegar = useNavigate();
  const eliminar = useEliminarEmpresa();
  const [confirmando, setConfirmando] = useState(false);

  return (
    <div className="flex flex-col gap-5">
      <Encabezado
        titulo={empresa.nombre}
        subtitulo={
          <>
            <span>{empresa.sector}</span>
            <span>
              {empresa.ciudad.nombre}, {empresa.ciudad.departamento}
            </span>
            <span>{plural(empresa.totalEmpleados, 'persona trabaja aquí', 'personas trabajan aquí')}</span>
          </>
        }
        acciones={
          <>
            <Link to={`/ofertas/nueva?empresa=${empresa.id}`} className={clasesBoton.primario}>
              Publicar oferta
            </Link>
            <Link to={`/caminos?tipo=empresa&destino=${empresa.id}`} className={clasesBoton.secundario}>
              Camino hasta aquí
            </Link>
            <Link to={`/empresas/${empresa.id}/editar`} className={clasesBoton.secundario}>
              Editar
            </Link>
            <Boton variante="peligroSuave" onClick={() => setConfirmando(true)}>
              Eliminar
            </Boton>
          </>
        }
      />

      <div className="grid items-start gap-4 md:grid-cols-2">
        <Tarjeta titulo="Ofertas">
          {empresa.ofertas.length === 0 && <p className="text-sm text-suave">No ha publicado ofertas.</p>}
          <ul className="flex flex-col gap-3">
            {empresa.ofertas.map((oferta) => (
              <li key={oferta.id} className="flex items-start justify-between gap-3 text-sm">
                <span>
                  <Link to={`/ofertas/${oferta.id}`} className="block font-semibold hover:underline">
                    {oferta.titulo}
                  </Link>
                  <span className="block text-xs text-suave">Publicada el {diaMesAnio(oferta.publicadaEn)}</span>
                </span>
                <Insignia tenue={oferta.estado !== 'abierta'}>{oferta.estado}</Insignia>
              </li>
            ))}
          </ul>
        </Tarjeta>
        <Tarjeta titulo="Proyectos">
          {empresa.proyectos.length === 0 && <p className="text-sm text-suave">No desarrolla proyectos.</p>}
          <ul className="flex flex-col gap-3">
            {empresa.proyectos.map((proyecto) => (
              <li key={proyecto.id} className="flex items-start justify-between gap-3 text-sm">
                <Link to={`/proyectos/${proyecto.id}`} className="font-semibold hover:underline">
                  {proyecto.nombre}
                </Link>
                <Insignia tenue={proyecto.estado !== 'en curso'}>{proyecto.estado}</Insignia>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>

      <ConfirmarEliminar
        abierto={confirmando}
        titulo={`¿Eliminar ${empresa.nombre}?`}
        detalle="Se borran los empleos en ella y sus proyectos quedan como comunitarios. Si tiene ofertas publicadas, hay que borrarlas antes."
        alCerrar={() => setConfirmando(false)}
        alConfirmar={async () => {
          await eliminar.mutateAsync(empresa.id);
          await navegar('/empresas');
        }}
      />
    </div>
  );
}

export function DetalleEmpresa() {
  const { id = '' } = useParams();
  return (
    <Detalle consulta={useEmpresa(id)} queNoExiste="Esta empresa no existe." rutaVolver="/empresas" textoVolver="Volver a empresas">
      {(empresa) => <ContenidoEmpresa empresa={empresa} />}
    </Detalle>
  );
}

const camposEmpresa = (ciudades: Ciudad[]): DefinicionCampo[] => [
  { nombre: 'nombre', etiqueta: 'Nombre', maximo: 120 },
  { nombre: 'sector', etiqueta: 'Sector', maximo: 120 },
  {
    nombre: 'ciudadId',
    etiqueta: 'Ciudad',
    tipo: 'opciones',
    opciones: [{ valor: '', texto: 'Elige una ciudad' }, ...ciudades.map((c) => ({ valor: c.id, texto: c.nombre }))],
  },
];

export function NuevaEmpresa() {
  const navegar = useNavigate();
  const crear = useCrearEmpresa();
  const ciudades = useCiudades();

  if (!ciudades.data) {
    return ciudades.error ? <MensajeError error={ciudades.error} alReintentar={() => void ciudades.refetch()} /> : <Cargando />;
  }

  return (
    <FormularioSimple
      titulo="Nueva empresa"
      campos={camposEmpresa(ciudades.data.datos)}
      inicial={{ nombre: '', sector: '', ciudadId: '' }}
      textoGuardar="Crear empresa"
      rutaCancelar="/empresas"
      alGuardar={async (valores) => {
        const creada = await crear.mutateAsync(valores as unknown as DatosEmpresa);
        await navegar(`/empresas/${creada.id}`, { replace: true });
      }}
    />
  );
}

export function EditarEmpresa() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const actualizar = useActualizarEmpresa(id);
  const ciudades = useCiudades();

  return (
    <Detalle consulta={useEmpresa(id)} queNoExiste="Esta empresa no existe." rutaVolver="/empresas" textoVolver="Volver a empresas">
      {(empresa) => {
        if (!ciudades.data) return <Cargando />;
        const inicial = { nombre: empresa.nombre, sector: empresa.sector, ciudadId: empresa.ciudad.id };
        return (
          <FormularioSimple
            key={empresa.id}
            titulo={`Editar ${empresa.nombre}`}
            campos={camposEmpresa(ciudades.data.datos)}
            inicial={inicial}
            textoGuardar="Guardar cambios"
            rutaCancelar={`/empresas/${id}`}
            alGuardar={async (valores) => {
              const cambios = soloCambios(inicial, valores as typeof inicial);
              if (Object.keys(cambios).length > 0) await actualizar.mutateAsync(cambios);
              await navegar(`/empresas/${id}`);
            }}
          />
        );
      }}
    </Detalle>
  );
}
