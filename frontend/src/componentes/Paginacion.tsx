import { Boton } from './ui';

interface Props {
  pagina: number;
  ultima: number;
  alCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, ultima, alCambiar }: Props) {
  if (ultima <= 1) return null;

  return (
    <nav aria-label="Paginación" className="flex items-center justify-center gap-3">
      <Boton disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>
        Anterior
      </Boton>
      <span className="text-sm text-suave">
        Página {pagina} de {ultima}
      </span>
      <Boton disabled={pagina >= ultima} onClick={() => alCambiar(pagina + 1)}>
        Siguiente
      </Boton>
    </nav>
  );
}
