import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { errorDeCampo, ErrorApi } from '../api/cliente';
import { useAccion } from '../utiles';
import { Boton, Campo, clasesBoton, clasesControl, MensajeError } from './ui';

export interface DefinicionCampo {
  nombre: string;
  etiqueta: string;
  tipo?: 'texto' | 'area' | 'opciones';
  opciones?: { valor: string; texto: string }[];
  maximo?: number;
}

interface Props {
  titulo: string;
  campos: DefinicionCampo[];
  inicial: Record<string, string>;
  textoGuardar: string;
  rutaCancelar: string;
  /** Si falla, el error queda en el formulario y lo escrito se conserva. */
  alGuardar: (valores: Record<string, string>) => Promise<unknown>;
}

/** Formulario de textos y listas. Igual que el de personas: la validación vive en el backend. */
export function FormularioSimple({ titulo, campos, inicial, textoGuardar, rutaCancelar, alGuardar }: Props) {
  const [valores, setValores] = useState(inicial);
  const { ejecutar, error, ocupado } = useAccion();

  const nombres = campos.map((c) => c.nombre);
  const tocaUnCampo = error instanceof ErrorApi && error.campos.some((c) => nombres.includes(c.campo));

  const enviar = (evento: FormEvent) => {
    evento.preventDefault();
    void ejecutar(() => alGuardar(valores));
  };

  return (
    <form noValidate onSubmit={enviar} className="mx-auto flex max-w-xl flex-col gap-5">
      <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>

      {campos.map((campo) => (
        <Campo key={campo.nombre} etiqueta={campo.etiqueta} error={errorDeCampo(error, campo.nombre)}>
          {(control) => {
            const comunes = {
              ...control,
              className: clasesControl,
              value: valores[campo.nombre] ?? '',
              onChange: (e: { target: { value: string } }) =>
                setValores((actuales) => ({ ...actuales, [campo.nombre]: e.target.value })),
            };
            if (campo.tipo === 'area') return <textarea {...comunes} rows={3} maxLength={campo.maximo} />;
            if (campo.tipo === 'opciones') {
              return (
                <select {...comunes}>
                  {campo.opciones?.map((opcion) => (
                    <option key={opcion.valor} value={opcion.valor}>
                      {opcion.texto}
                    </option>
                  ))}
                </select>
              );
            }
            return <input {...comunes} maxLength={campo.maximo} />;
          }}
        </Campo>
      ))}

      {error && !tocaUnCampo ? <MensajeError error={error} /> : null}

      <div className="flex justify-end gap-2">
        <Link to={rutaCancelar} className={clasesBoton.secundario}>
          Cancelar
        </Link>
        <Boton type="submit" variante="primario" disabled={ocupado}>
          {ocupado ? 'Guardando…' : textoGuardar}
        </Boton>
      </div>
    </form>
  );
}
