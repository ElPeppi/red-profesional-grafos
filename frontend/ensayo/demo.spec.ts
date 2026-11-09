import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { esperarGrafo } from '../e2e/ayudas';

// Ensayo de docs/guion-demo.md: los mismos clics, los mismos datos y lo que el guion dice que debe verse.
// Si pasa la víspera, la demo funciona. Requiere la semilla recién cargada (scripts/preparar-demo.ps1).
// Al terminar, pase o falle, borra a Lucía y la oferta para dejar la base como la encontró.

const LUCIA = { nombre: 'Lucía Fernández', email: 'lucia.fernandez@example.com' };
const OFERTA = 'Ingeniero de Datos';
const SEMILLA_SUCIA = 'La base no está como la deja la semilla. Recárgala: scripts/preparar-demo.ps1';

const tarjeta = (page: Page, titulo: string | RegExp) => page.getByRole('region', { name: titulo });
const cabecera = (page: Page) => page.getByRole('banner');
// Solo los ítems de primer nivel: candidatos y empleos traen sus razones en una lista anidada.
const elementos = (page: Page, titulo: string | RegExp) => tarjeta(page, titulo).locator('ul, ol').first().locator(':scope > li');
const fila = (page: Page, titulo: string | RegExp, texto: string) => elementos(page, titulo).filter({ hasText: texto });

async function actuarComo(page: Page, texto: string, nombre: string) {
  const combo = page.getByRole('combobox', { name: 'Actuar como' });
  if (!(await combo.isVisible())) await cabecera(page).getByRole('button', { name: 'Cambiar' }).click();
  await combo.fill(texto);
  await page.getByRole('option', { name: nombre }).click();
  await expect(cabecera(page).getByRole('link', { name: nombre })).toBeVisible();
}

interface Pagina<T> {
  datos: T[];
}

// Por email y sobre la lista completa (la semilla trae 40 personas; la API da hasta 100 por página):
// buscar por nombre no encuentra a una Lucía cuyo nombre quedó mal escrito, y el email es lo que choca.
async function luciaYOferta(request: APIRequestContext) {
  const personas = (await (await request.get('/api/usuarios?limite=100')).json()) as Pagina<{
    id: string;
    email: string;
  }>;
  const ofertas = (await (await request.get('/api/ofertas?limite=100')).json()) as Pagina<{
    id: string;
    titulo: string;
    empresa: { nombre: string };
  }>;
  return {
    lucia: personas.datos.filter((p) => p.email === LUCIA.email),
    ofertas: ofertas.datos.filter((o) => o.titulo === OFERTA && o.empresa.nombre === 'Caribe Software'),
  };
}

test.beforeAll(async ({ request }) => {
  const { lucia, ofertas } = await luciaYOferta(request);
  const solicitudes = (await (await request.get('/api/usuarios/usr-02/solicitudes')).json()) as { recibidas: unknown[] };
  expect(lucia, `${SEMILLA_SUCIA} (ya existe ${LUCIA.nombre})`).toHaveLength(0);
  expect(ofertas, `${SEMILLA_SUCIA} (ya existe la oferta ${OFERTA})`).toHaveLength(0);
  expect(solicitudes.recibidas, `${SEMILLA_SUCIA} (Carlos Mejía debe tener 1 solicitud, la de Valeria Ortiz)`).toHaveLength(1);
});

test.afterAll(async ({ request }) => {
  // Borrar a Lucía se lleva su conexión y su postulación; la oferta se borra aparte.
  const { lucia, ofertas } = await luciaYOferta(request);
  for (const persona of lucia) await request.delete(`/api/usuarios/${persona.id}`);
  for (const oferta of ofertas) await request.delete(`/api/ofertas/${oferta.id}`);
});

test('el guion de la demo, de punta a punta', async ({ page }) => {
  await test.step('C1. Crear y vincular', async () => {
    await page.goto('/personas');
    await page.getByRole('link', { name: 'Nueva persona' }).click();
    await page.getByLabel('Nombre').fill(LUCIA.nombre);
    await page.getByLabel('Email').fill(LUCIA.email);
    await page.getByLabel('Titular').fill('Data Engineer');
    await page.getByLabel('Ciudad').selectOption({ label: 'Barranquilla' });
    await page.getByLabel('Años de experiencia').fill('2');
    await page.getByLabel('Abierto a ofertas').check();
    await page.getByRole('button', { name: 'Crear persona' }).click();
    await expect(page.getByRole('heading', { name: LUCIA.nombre, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Editar habilidades' }).click();
    for (const [habilidad, nivel] of [['Python', '4'], ['SQL', '4'], ['Neo4j', '3']] as const) {
      // El formulario se vacía cuando termina de guardar: elegir la siguiente antes la borraría.
      await expect(page.getByLabel('Habilidad nueva')).toHaveValue('');
      await page.getByLabel('Habilidad nueva').selectOption({ label: habilidad });
      await page.getByLabel('Nivel', { exact: true }).selectOption(nivel);
      await page.getByRole('button', { name: 'Agregar', exact: true }).click();
      await expect(tarjeta(page, 'Habilidades').getByText(habilidad, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Terminar de editar habilidades' }).click();

    await page.getByRole('button', { name: 'Editar empleos' }).click();
    await page.getByLabel('Empresa').selectOption({ label: 'Puerto Logística Digital' });
    await page.getByLabel('Cargo').fill('Data Engineer');
    await page.getByLabel('Desde').fill('2025-03-01');
    await page.getByLabel('Trabaja ahí actualmente').check();
    await page.getByRole('button', { name: 'Agregar empleo' }).click();
    await expect(tarjeta(page, 'Empleos')).toContainText('Puerto Logística Digital');
    await page.getByRole('button', { name: 'Terminar de editar empleos' }).click();

    await page.getByRole('link', { name: 'Editar', exact: true }).click();
    await page.getByLabel('Titular').fill('Data Engineer en Puerto Logística Digital');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    await expect(page.getByText('Data Engineer en Puerto Logística Digital').first()).toBeVisible();

    for (const nombre of ['Ana María Lozano', 'Diego Ramírez', 'Mateo Sánchez']) {
      await expect(fila(page, 'Habilidades parecidas', nombre)).toContainText('60 %');
    }
  });

  await test.step('C2. Recomendación de contactos y conexión', async () => {
    await page.getByRole('button', { name: 'Actuar como esta persona' }).click();
    await page.getByRole('link', { name: 'Mi red' }).first().click();
    const carlos = fila(page, 'Personas que podrías conocer', 'Carlos Mejía');
    await expect(carlos).toContainText('Coincidieron en Puerto Logística Digital');
    await expect(carlos).toContainText('Viven en la misma ciudad');
    await page.getByRole('button', { name: 'Conectar con Carlos Mejía' }).click();
    await expect(tarjeta(page, 'Solicitudes enviadas')).toContainText('Carlos Mejía');

    await actuarComo(page, 'mejia', 'Carlos Mejía');
    await expect(tarjeta(page, 'Solicitudes recibidas')).toContainText(LUCIA.nombre);
    await expect(tarjeta(page, 'Solicitudes recibidas')).toContainText('Valeria Ortiz');
    await page.getByRole('button', { name: `Aceptar a ${LUCIA.nombre}` }).click();
    await expect(tarjeta(page, /^Conexiones/)).toContainText(LUCIA.nombre);
  });

  await test.step('C3. Empresa, oferta y requisitos', async () => {
    await page.getByRole('link', { name: 'Empresas' }).first().click();
    await page.getByRole('link', { name: /Caribe Software/ }).first().click();
    await page.getByRole('link', { name: 'Publicar oferta' }).click();
    await page.getByLabel('Título').fill(OFERTA);
    await page.getByLabel('Ciudad').selectOption({ label: 'Barranquilla' });
    await page.getByLabel('Nivel').selectOption('junior');
    await page.getByLabel('Modalidad').selectOption('híbrido');
    await page.getByRole('button', { name: 'Publicar oferta' }).click();
    await expect(page.getByRole('heading', { name: OFERTA, level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'Editar requisitos' }).click();
    const requisitos = tarjeta(page, 'Requisitos');
    for (const [habilidad, nivel, obligatoria] of [['Python', '3', true], ['SQL', '3', true], ['Neo4j', '2', false]] as const) {
      await expect(requisitos.getByLabel('Habilidad requerida')).toHaveValue('');
      await requisitos.getByLabel('Habilidad requerida').selectOption({ label: habilidad });
      await requisitos.getByLabel('Nivel mínimo', { exact: true }).selectOption(nivel);
      await requisitos.getByLabel('Es obligatoria', { exact: true }).setChecked(obligatoria);
      await requisitos.getByRole('button', { name: 'Agregar requisito' }).click();
      await expect(requisitos.getByText(habilidad, { exact: true })).toBeVisible();
    }
    await page.getByRole('button', { name: 'Terminar de editar requisitos' }).click();
    await expect(requisitos).toContainText('deseable');

    const candidatos = elementos(page, 'Candidatos sugeridos');
    await expect(candidatos.first()).toContainText(LUCIA.nombre);
    await expect(candidatos.first()).toContainText('ajuste 80 %');
    await expect(candidatos.first()).toContainText('Conoce ahí a Carlos Mejía');
    await expect(candidatos.first()).toContainText('Vive en la ciudad de la oferta');
    await expect(candidatos.nth(1)).toContainText('Diego Ramírez');
    await expect(candidatos.nth(1)).toContainText('ajuste 70 %');
  });

  await test.step('C4. Recomendación de empleos y postulación', async () => {
    await actuarComo(page, 'lucia', LUCIA.nombre);
    await page.getByRole('link', { name: 'Mi red' }).first().click();
    const empleos = elementos(page, 'Empleos para ti');
    await expect(empleos.first()).toContainText(OFERTA);
    await expect(empleos.first()).toContainText('Caribe Software');
    await expect(empleos.first()).toContainText('ajuste 80 %');
    await page.getByRole('button', { name: `Postularme a ${OFERTA}`, exact: true }).click();
    await expect(tarjeta(page, 'Mis postulaciones')).toContainText(OFERTA);

    await tarjeta(page, 'Mis postulaciones').getByRole('link', { name: OFERTA }).click();
    await expect(tarjeta(page, 'Postulantes (1)')).toContainText(LUCIA.nombre);
    await page.getByLabel(`Estado de ${LUCIA.nombre}`).selectOption('entrevista');
    await expect(page.getByLabel(`Estado de ${LUCIA.nombre}`)).toHaveValue('entrevista');
  });

  await test.step('C5. Borrar e integridad', async () => {
    await tarjeta(page, 'Postulantes (1)').getByRole('link', { name: LUCIA.nombre }).click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page).toHaveURL(/\/personas$/);

    await page.getByRole('link', { name: 'Ofertas' }).first().click();
    // Cada oferta de la lista es un enlace con título, empresa y modalidad: se busca por el título.
    await page.getByRole('link').filter({ has: page.getByText(OFERTA, { exact: true }) }).click();
    await expect(tarjeta(page, 'Postulantes (0)')).toContainText('Nadie se ha postulado todavía.');
  });

  await test.step('D. Perfil, caminos y proyectos', async () => {
    await actuarComo(page, 'suarez', 'Alejandro Suárez');
    await page.getByRole('link', { name: 'Personas' }).first().click();
    await page.getByRole('searchbox', { name: 'Buscar personas' }).fill('diego');
    await page.getByRole('link', { name: /Diego Ramírez/ }).click();
    for (const nombre of ['Mariana López', 'Nicolás Cárdenas', 'Paula Moreno']) {
      await expect(tarjeta(page, 'Contactos en común')).toContainText(nombre);
    }
    const parecidas = elementos(page, 'Habilidades parecidas');
    await expect(parecidas.first()).toContainText('Eduardo Espitia');
    await expect(parecidas.first()).toContainText('67 %');
    await expect(parecidas.nth(1)).toContainText('Alejandro Suárez');
    await expect(parecidas.nth(1)).toContainText('57 %');

    await page.getByRole('link', { name: 'Caminos' }).first().click();
    await page.getByRole('main').getByRole('button', { name: 'Cambiar' }).click();
    await page.getByRole('combobox', { name: 'Buscar persona' }).fill('kevin');
    await page.getByRole('option', { name: /Kevin Petro/ }).click();
    // Elegir el destino antes de que la página se pinte con el nuevo origen lo perdería (ver CLAUDE.md).
    await expect(page).toHaveURL(/origen=usr-38/);
    await expect(page.getByRole('main')).toContainText('Kevin Petro');
    await page.getByLabel('Empresa de destino').selectOption({ label: 'Estudio Pixel' });
    const main = page.getByRole('main');
    await expect(main).toContainText('A 3 saltos');
    await expect(main).toContainText(/Kevin Petro.*Marcela Doria.*Daniel Quintero.*Estudio Pixel/);
    await esperarGrafo(page);

    await page.getByRole('button', { name: 'Oferta', exact: true }).click();
    await page.getByLabel('Oferta de destino').selectOption({ label: 'Ingeniero de Grafos Neo4j · AndesData' });
    await expect(main).toContainText('A 4 saltos');
    await expect(main).toContainText(/Marcela Doria.*Carolina Muñoz.*AndesData/);

    await page.getByRole('link', { name: 'Proyectos' }).first().click();
    // El orden de las tecnologías cambia al recargar la semilla (collect() sin orden): se revisa cada una.
    const pareja = fila(page, 'Proyectos relacionados', 'Scoring Crediticio con ML y Lago de Datos Retail').first();
    for (const tecnologia of ['AWS', 'SQL', 'Python']) await expect(pareja).toContainText(tecnologia);
    await page.getByRole('link', { name: /Grafo Antifraude/ }).first().click();
    const colaboradores = elementos(page, 'Colaboradores sugeridos');
    await expect(colaboradores.first()).toContainText('Alejandro Suárez');
    await expect(colaboradores.first()).toContainText('ajuste 80 %');
    await expect(colaboradores.nth(1)).toContainText('Eduardo Espitia');
    await expect(colaboradores.nth(2)).toContainText('Natalia Vargas');
  });

  await test.step('E. Panel de analítica', async () => {
    await page.getByRole('link', { name: 'Panel' }).first().click();
    const main = page.getByRole('main');
    for (const [numero, personas] of [[1, 10], [2, 10], [3, 8], [4, 5], [5, 5]] as const) {
      await expect(main).toContainText(`Comunidad ${numero} · ${personas} personas`);
    }
    await expect(main).toContainText('2 personas sin comunidad');
    await esperarGrafo(page);
    // Las secciones del panel no son tarjetas: se ubican por su encabezado.
    const ranking = (titulo: string) =>
      page.locator('section').filter({ has: page.getByRole('heading', { name: titulo }) }).locator('ol > li');
    const influyentes = ranking('Usuarios más influyentes');
    // Carlos Mejía y Paula Moreno empatan en 1.72: el orden entre ellos no importa.
    for (const i of [0, 1]) {
      await expect(influyentes.nth(i)).toContainText(/Carlos Mejía|Paula Moreno/);
      await expect(influyentes.nth(i)).toContainText('1.72');
    }
    await expect(influyentes.nth(2)).toContainText('Juliana Ospina');
    await expect(influyentes.nth(2)).toContainText('1.58');
    // SQL era 6 en la semilla: la oferta publicada en C3 ya cuenta.
    const sql = ranking('Habilidades más demandadas').first();
    await expect(sql).toContainText('SQL');
    await expect(sql).toContainText('7');
  });
});
