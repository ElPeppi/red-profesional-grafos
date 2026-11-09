import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router';
import { ErrorApi } from './api/cliente';
import { Marco } from './componentes/Marco';
import { ProveedorUsuarioActual } from './contexto/UsuarioActual';
import './index.css';
import { Caminos } from './paginas/Caminos';
import { DetalleEmpresa, EditarEmpresa, ListaEmpresas, NuevaEmpresa } from './paginas/Empresas';
import { DetalleOferta, EditarOferta, ListaOfertas, NuevaOferta } from './paginas/Ofertas';
import { DetalleProyecto, EditarProyecto, ListaProyectos, NuevoProyecto } from './paginas/Proyectos';
import { ErrorDeRuta, NoEncontrada } from './paginas/Errores';
import { MiRed } from './paginas/MiRed';
import { EditarPersona, NuevaPersona } from './paginas/FormularioPersona';
import { Panel } from './paginas/Panel';
import { Perfil } from './paginas/Perfil';
import { Personas } from './paginas/Personas';

// Repetir sirve si el fallo es pasajero. Un 4xx daría lo mismo cada vez, y un 503 ya llega
// después de 7 s de reintentos en el backend: repetirlo dejaría la pantalla esperando 20 s.
const valeReintentar = (error: Error) =>
  !(error instanceof ErrorApi) || error.estado === 0 || error.estado === 500;

const clienteConsultas = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      retry: (fallos, error) => fallos < 2 && valeReintentar(error),
    },
  },
});

const enrutador = createBrowserRouter([
  {
    element: <Marco />,
    errorElement: <ErrorDeRuta />,
    children: [
      { index: true, element: <Navigate to="/personas" replace /> },
      { path: 'mi-red', element: <MiRed /> },
      { path: 'personas', element: <Personas /> },
      { path: 'personas/nueva', element: <NuevaPersona /> },
      { path: 'personas/:id', element: <Perfil /> },
      { path: 'personas/:id/editar', element: <EditarPersona /> },
      { path: 'empresas', element: <ListaEmpresas /> },
      { path: 'empresas/nueva', element: <NuevaEmpresa /> },
      { path: 'empresas/:id', element: <DetalleEmpresa /> },
      { path: 'empresas/:id/editar', element: <EditarEmpresa /> },
      { path: 'ofertas', element: <ListaOfertas /> },
      { path: 'ofertas/nueva', element: <NuevaOferta /> },
      { path: 'ofertas/:id', element: <DetalleOferta /> },
      { path: 'ofertas/:id/editar', element: <EditarOferta /> },
      { path: 'proyectos', element: <ListaProyectos /> },
      { path: 'proyectos/nuevo', element: <NuevoProyecto /> },
      { path: 'proyectos/:id', element: <DetalleProyecto /> },
      { path: 'proyectos/:id/editar', element: <EditarProyecto /> },
      { path: 'panel', element: <Panel /> },
      { path: 'caminos', element: <Caminos /> },
      { path: '*', element: <NoEncontrada /> },
    ],
  },
]);

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Falta el elemento #raiz en index.html');

createRoot(raiz).render(
  <StrictMode>
    <QueryClientProvider client={clienteConsultas}>
      <ProveedorUsuarioActual>
        <RouterProvider router={enrutador} />
      </ProveedorUsuarioActual>
    </QueryClientProvider>
  </StrictMode>,
);
