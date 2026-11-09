import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useCiudades } from '../api/catalogos';
import { ErrorApi } from '../api/cliente';
import {
  useActualizarUsuario,
  useCrearUsuario,
  usePerfil,
  type DatosUsuario,
  type Perfil,
} from '../api/usuarios';
import { Boton, Campo, Cargando, clasesBoton, clasesControl, MensajeError, Vacio } from '../componentes/ui';
import { useSinRepetir } from '../utiles';

interface Valores {
  nombre: string;
  email: string;
  titular: string;
  aniosExperiencia: string;
  abiertoAOfertas: boolean;
  ciudadId: string;
}

const VALORES_VACIOS: Valores = {
  nombre: '',
  email: '',
  titular: '',
  aniosExperiencia: '0',
  abiertoAOfertas: false,
  ciudadId: '',
};

const valoresDe = (usuario: Perfil): Valores => ({
  nombre: usuario.nombre,
  email: usuario.email,
  titular: usuario.titular,
  aniosExperiencia: String(usuario.aniosExperiencia),
  abiertoAOfertas: usuario.abiertoAOfertas,
  ciudadId: usuario.ciudad.id,
});

// Un input numérico entrega texto, y vacío si lo escrito no es un número.
const aDatos = ({ aniosExperiencia, ...resto }: Valores): DatosUsuario => ({
  ...resto,
  aniosExperiencia: aniosExperiencia === '' ? 0 : Number(aniosExperiencia),
});

interface PropsFormulario {
  titulo: string;
  inicial: Valores;
  rutaCancelar: string;
  textoGuardar: string;
  guardando: boolean;
  error: Error | null;
  alGuardar: (valores: Valores) => Promise<unknown>;
}

// noValidate: la regla vive en el backend. Repetirla aquí crea dos versiones que se separan.
function Formulario(props: PropsFormulario) {
  const { titulo, inicial, rutaCancelar, textoGuardar, guardando, error, alGuardar } = props;
  const [valores, setValores] = useState(inicial);
  const ciudades = useCiudades();
  const sinRepetir = useSinRepetir();

  const cambiar = <C extends keyof Valores>(campo: C, valor: Valores[C]) =>
    setValores((actuales) => ({ ...actuales, [campo]: valor }));

  const errorApi = error instanceof ErrorApi ? error : null;
  const errorDe = (campo: keyof Valores) => {
    if (campo === 'email' && errorApi?.codigo === 'YA_EXISTE') return 'Ya existe una persona con ese email';
    return errorApi?.campos.find((c) => c.campo === campo)?.mensaje;
  };
  // Lo que tiene campo se muestra junto a él; el resto, abajo.
  const tocaUnCampo =
    errorApi?.codigo === 'YA_EXISTE' || errorApi?.campos.some((c) => c.campo in VALORES_VACIOS);

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    void sinRepetir(() => alGuardar(valores));
  };

  return (
    <form noValidate onSubmit={enviar} className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>

      <Campo etiqueta="Nombre" error={errorDe('nombre')}>
        {(control) => (
          <input
            {...control}
            className={clasesControl}
            maxLength={120}
            value={valores.nombre}
            onChange={(e) => cambiar('nombre', e.target.value)}
          />
        )}
      </Campo>

      <Campo etiqueta="Email" error={errorDe('email')}>
        {(control) => (
          <input
            {...control}
            type="email"
            className={clasesControl}
            value={valores.email}
            onChange={(e) => cambiar('email', e.target.value)}
          />
        )}
      </Campo>

      <Campo etiqueta="Titular" error={errorDe('titular')}>
        {(control) => (
          <input
            {...control}
            className={clasesControl}
            maxLength={200}
            placeholder="Ej.: Frontend Developer en Caribe Software"
            value={valores.titular}
            onChange={(e) => cambiar('titular', e.target.value)}
          />
        )}
      </Campo>

      <div className="grid gap-5 sm:grid-cols-2">
        <Campo etiqueta="Ciudad" error={errorDe('ciudadId')}>
          {(control) => (
            <select
              {...control}
              className={clasesControl}
              value={valores.ciudadId}
              onChange={(e) => cambiar('ciudadId', e.target.value)}
            >
              <option value="">Elige una ciudad</option>
              {ciudades.data?.datos.map((ciudad) => (
                <option key={ciudad.id} value={ciudad.id}>
                  {ciudad.nombre}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Campo etiqueta="Años de experiencia" error={errorDe('aniosExperiencia')}>
          {(control) => (
            <input
              {...control}
              type="number"
              min={0}
              max={80}
              className={clasesControl}
              value={valores.aniosExperiencia}
              onChange={(e) => cambiar('aniosExperiencia', e.target.value)}
            />
          )}
        </Campo>
      </div>

      <label className="flex items-center gap-2 text-sm font-semibold">
        <input
          type="checkbox"
          className="size-4 accent-marca"
          checked={valores.abiertoAOfertas}
          onChange={(e) => cambiar('abiertoAOfertas', e.target.checked)}
        />
        Abierto a ofertas
      </label>

      {ciudades.error && <MensajeError error={ciudades.error} alReintentar={() => void ciudades.refetch()} />}
      {error && !tocaUnCampo && <MensajeError error={error} />}

      <div className="flex justify-end gap-2">
        <Link to={rutaCancelar} className={clasesBoton.secundario}>
          Cancelar
        </Link>
        <Boton type="submit" variante="primario" disabled={guardando}>
          {guardando ? 'Guardando…' : textoGuardar}
        </Boton>
      </div>
    </form>
  );
}

export function NuevaPersona() {
  const navegar = useNavigate();
  const crear = useCrearUsuario();

  return (
    <Formulario
      titulo="Nueva persona"
      inicial={VALORES_VACIOS}
      rutaCancelar="/personas"
      textoGuardar="Crear persona"
      guardando={crear.isPending}
      error={crear.error}
      alGuardar={async (valores) => {
        const creado = await crear.mutateAsync(aDatos(valores));
        await navegar(`/personas/${creado.id}`, { replace: true });
      }}
    />
  );
}

export function EditarPersona() {
  const { id = '' } = useParams();
  const navegar = useNavigate();
  const { data: usuario, error, refetch } = usePerfil(id);
  const actualizar = useActualizarUsuario(id);

  if (error instanceof ErrorApi && error.estado === 404) return <Vacio>Esta persona no existe.</Vacio>;
  if (!usuario) {
    return error ? <MensajeError error={error} alReintentar={() => void refetch()} /> : <Cargando />;
  }

  const rutaPerfil = `/personas/${id}`;
  const inicial = valoresDe(usuario);

  const guardar = async (valores: Valores) => {
    // Solo lo que cambió: un PATCH con todo pisaría lo que otro haya editado mientras tanto.
    const original = aDatos(inicial);
    const cambios = Object.fromEntries(
      Object.entries(aDatos(valores)).filter(([campo, valor]) => valor !== original[campo as keyof DatosUsuario]),
    );

    if (Object.keys(cambios).length > 0) await actualizar.mutateAsync(cambios);
    await navegar(rutaPerfil);
  };

  return (
    <Formulario
      key={usuario.id}
      titulo={`Editar a ${usuario.nombre}`}
      inicial={inicial}
      rutaCancelar={rutaPerfil}
      textoGuardar="Guardar cambios"
      guardando={actualizar.isPending}
      error={actualizar.error}
      alGuardar={guardar}
    />
  );
}
