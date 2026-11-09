const API = 'http://localhost:3000';

/** Marca de lo que crean las pruebas: igual que en las pruebas del backend. */
export const MARCA = '[prueba] ';

async function todas<T>(ruta: string): Promise<T[]> {
  const filas: T[] = [];
  for (let pagina = 1; ; pagina++) {
    const respuesta = await fetch(`${API}${ruta}${ruta.includes('?') ? '&' : '?'}limite=100&pagina=${pagina}`);
    const { datos } = (await respuesta.json()) as { datos: T[] };
    if (datos.length === 0) return filas;
    filas.push(...datos);
  }
}

const borrar = (ruta: string, ids: string[]) =>
  Promise.all(ids.map((id) => fetch(`${API}${ruta}/${id}`, { method: 'DELETE' })));

/**
 * Corre al final aunque una prueba falle: borra personas con email @prueba.test, y empresas,
 * ofertas y proyectos con la marca. Las ofertas van primero: una empresa con ofertas no se borra.
 */
export default async function limpiarDatosDePrueba() {
  const ofertas = await todas<{ id: string; titulo: string }>('/ofertas');
  await borrar('/ofertas', ofertas.filter((o) => o.titulo.startsWith(MARCA)).map((o) => o.id));

  const proyectos = await todas<{ id: string; nombre: string }>('/proyectos');
  await borrar('/proyectos', proyectos.filter((p) => p.nombre.startsWith(MARCA)).map((p) => p.id));

  const empresas = await todas<{ id: string; nombre: string }>('/empresas');
  await borrar('/empresas', empresas.filter((e) => e.nombre.startsWith(MARCA)).map((e) => e.id));

  const usuarios = await todas<{ id: string; email: string }>('/usuarios');
  await borrar('/usuarios', usuarios.filter((u) => u.email.endsWith('@prueba.test')).map((u) => u.id));
}
