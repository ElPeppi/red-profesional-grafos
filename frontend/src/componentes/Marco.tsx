import { Link, NavLink, Outlet } from 'react-router';
import { SelectorUsuario } from './SelectorUsuario';

const claseEnlace = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-marca-suave text-marca-fuerte' : 'text-suave hover:text-tinta'
  }`;

export function Marco() {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-borde bg-papel/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-5 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-titulo text-lg font-bold tracking-tight">
              Red profesional
            </Link>
            <nav aria-label="Principal" className="flex flex-wrap gap-1">
              <NavLink to="/mi-red" className={claseEnlace}>
                Mi red
              </NavLink>
              <NavLink to="/personas" className={claseEnlace}>
                Personas
              </NavLink>
              <NavLink to="/empresas" className={claseEnlace}>
                Empresas
              </NavLink>
              <NavLink to="/ofertas" className={claseEnlace}>
                Ofertas
              </NavLink>
              <NavLink to="/proyectos" className={claseEnlace}>
                Proyectos
              </NavLink>
              <NavLink to="/panel" className={claseEnlace}>
                Panel
              </NavLink>
              <NavLink to="/caminos" className={claseEnlace}>
                Caminos
              </NavLink>
            </nav>
          </div>
          <SelectorUsuario />
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">
        <Outlet />
      </main>
    </div>
  );
}
