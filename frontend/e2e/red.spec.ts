import { expect, test, type Page } from '@playwright/test';
import { API, clicEnNodo, conectarPorApi, crearPorApi, emailDePrueba, esperarGrafo, pixelesDeColor } from './ayudas';
import limpiarDatosDePrueba from './limpieza';

const AZUL = '#2a78d6';
const AMBAR = '#eda100';
const ROJO = '#e34948';
const VERDE_AGUA = '#1baf7a';
const TINTA = '#1d2129';

const grafo = (page: Page) => page.locator('[role="img"][data-listo]');

// Aquí cuentan toda la red: no deben quedar personas de las otras pruebas.
test.beforeEach(limpiarDatosDePrueba);

// Un error de render en el canvas no se ve en el DOM: solo queda en la consola.
let erroresDePagina: Error[] = [];

test.beforeEach(({ page }) => {
  erroresDePagina = [];
  page.on('pageerror', (error) => erroresDePagina.push(error));
});

test.afterEach(() => {
  expect(erroresDePagina).toEqual([]);
});

test.describe('Panel', () => {
  test('muestra comunidades, influyentes y habilidades', async ({ page }) => {
    await page.goto('/panel');

    await expect(page.getByText('Comunidad 1 · 10 personas')).toBeVisible();
    await expect(page.getByText('Comunidad 5 · 5 personas')).toBeVisible();
    await expect(page.getByText('2 personas sin comunidad')).toBeVisible();

    const carlos = page.getByRole('listitem').filter({ hasText: 'Carlos Mejía' }).last();
    await expect(carlos).toContainText('8 conexiones');
    await expect(carlos).toContainText('1.72');

    const sql = page.getByRole('listitem').filter({ hasText: 'SQL' });
    await expect(sql).toContainText('obligatoria en 4 · 18 profesionales');
    await expect(sql).toContainText('6');
  });

  test('dibuja solo a las personas, coloreadas por comunidad', async ({ page }) => {
    await page.goto('/panel');
    await esperarGrafo(page);

    await expect(grafo(page)).toHaveAttribute(
      'aria-label',
      'Red de 40 personas y 75 conexiones, agrupadas en 5 comunidades',
    );
    for (const color of [AZUL, VERDE_AGUA, AMBAR, '#008300', ROJO]) {
      expect(await pixelesDeColor(page, color)).toBeGreaterThan(0);
    }
  });

  test('abrir una comunidad lista a sus miembros, y cada uno lleva a su perfil', async ({ page }) => {
    await page.goto('/panel');

    await page.getByText('Comunidad 1 · 10 personas').click();
    await page.getByRole('link', { name: 'Andrea Pérez' }).click();

    await expect(page).toHaveURL(/\/personas\/usr-01$/);
  });

  test('un clic en un nodo abre el perfil de esa persona', async ({ page }) => {
    await page.goto('/panel');
    await esperarGrafo(page);

    await clicEnNodo(page, AZUL);

    await expect(page).toHaveURL(/\/personas\/usr-\d+$/);
  });

  test('lo que cambia en la red se ve al volver, sin recargar', async ({ page }) => {
    await page.goto('/panel');
    await esperarGrafo(page);

    await page.getByRole('link', { name: 'Personas', exact: true }).click();
    await page.getByRole('link', { name: 'Nueva persona' }).click();
    await page.getByLabel('Nombre').fill('Recién Llegada');
    await page.getByLabel('Email').fill(emailDePrueba());
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByRole('button', { name: 'Crear persona' }).click();
    await expect(page.getByRole('heading', { name: 'Recién Llegada', level: 1 })).toBeVisible();

    await page.getByRole('link', { name: 'Panel', exact: true }).click();

    await expect(page.getByText('3 personas sin comunidad')).toBeVisible();
    await expect(grafo(page)).toHaveAttribute('aria-label', /Red de 41 personas/);
  });

  test('una sexta comunidad va en gris, con su número, y no junta homónimos', async ({ page, request }) => {
    const [a, b] = [await crearPorApi(request, 'Tocaya Igual'), await crearPorApi(request, 'Tocaya Igual')];
    await conectarPorApi(request, a.id, b.id);

    await page.goto('/panel');
    await page.getByText('Comunidad 6 · 2 personas').click();

    const fila = page.getByRole('listitem').filter({ hasText: 'Comunidad 6' });
    const enlaces = fila.getByRole('link', { name: 'Tocaya Igual' });
    await expect(enlaces).toHaveCount(2);
    await expect(enlaces.nth(0)).not.toHaveAttribute('href', (await enlaces.nth(1).getAttribute('href')) ?? '');
    await expect(fila.locator('summary > span').first()).toHaveCSS('background-color', 'rgb(168, 163, 150)');
    await expect(fila.locator('summary > span').first()).toHaveText('6');
  });

  test('un fallo en una sección no tumba las demás, y Reintentar la recupera', async ({ page }) => {
    await page.route('**/api/analitica/comunidades', (ruta) =>
      ruta.fulfill({
        status: 503,
        json: { codigo: 'BASE_NO_DISPONIBLE', mensaje: 'La base de datos no está disponible' },
      }),
    );

    await page.goto('/panel');

    await expect(page.getByRole('alert')).toContainText('La base de datos no está disponible');
    await expect(page.getByRole('listitem').filter({ hasText: 'SQL' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Carlos Mejía' })).toBeVisible();

    await page.unroute('**/api/analitica/comunidades');
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByText('Comunidad 1 · 10 personas')).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('una arista hacia un nodo que no llegó no tumba el dibujo', async ({ page }) => {
    await page.route('**/api/analitica/grafo', async (ruta) => {
      const respuesta = await ruta.fetch();
      const cuerpo = await respuesta.json();
      cuerpo.aristas.push({ origen: 'usr-01', destino: 'recien-creado', tipo: 'CONECTA_CON' });
      await ruta.fulfill({ response: respuesta, json: cuerpo });
    });

    await page.goto('/panel');
    await esperarGrafo(page);

    expect(await pixelesDeColor(page, AZUL)).toBeGreaterThan(0);
  });

  test('la librería del grafo solo baja en las vistas que la usan', async ({ page }) => {
    const pedidas: string[] = [];
    page.on('request', (r) => pedidas.push(r.url()));

    await page.goto('/personas');
    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeVisible();
    expect(pedidas.filter((url) => url.includes('componentes/GrafoRed'))).toEqual([]);

    await page.getByRole('link', { name: 'Panel', exact: true }).click();
    await esperarGrafo(page);
    expect(pedidas.filter((url) => url.includes('componentes/GrafoRed'))).not.toEqual([]);
  });
});

test.describe('Caminos', () => {
  const CAMINO_KEVIN = '/caminos?origen=usr-38&tipo=empresa&destino=emp-06';

  test('muestra el camino por relaciones, y sobrevive a recargar', async ({ page }) => {
    await page.goto(CAMINO_KEVIN);

    await expect(page.getByText('A 3 saltos')).toBeVisible();
    const camino = page.getByRole('list').filter({ hasText: 'Marcela Doria' });
    await expect(camino).toHaveText(
      'Kevin Petro— conexión —Marcela Doria— conexión —Daniel Quintero— empleo —Estudio Pixel',
    );
    await expect(grafo(page)).toHaveAttribute(
      'aria-label',
      'Camino resaltado: Kevin Petro, Marcela Doria, Daniel Quintero, Estudio Pixel',
    );

    await page.reload();

    await expect(page.getByText('A 3 saltos')).toBeVisible();
    await expect(page.getByLabel('Empresa de destino')).toHaveValue('emp-06');
  });

  test('resaltar atenúa lo que no está en el camino', async ({ page }) => {
    await page.goto('/caminos?origen=usr-38');
    await esperarGrafo(page);
    expect(await pixelesDeColor(page, ROJO)).toBeGreaterThan(0);

    await page.getByLabel('Empresa de destino').selectOption({ label: 'Estudio Pixel' });
    await expect(page.getByText('A 3 saltos')).toBeVisible();
    await page.waitForTimeout(800);

    // Las ofertas quedan fuera del camino: ni un píxel con su color pleno. La empresa sí.
    expect(await pixelesDeColor(page, ROJO)).toBe(0);
    expect(await pixelesDeColor(page, AMBAR)).toBeGreaterThan(0);
  });

  test('traza el camino con línea oscura', async ({ page }) => {
    await page.goto(CAMINO_KEVIN);
    await esperarGrafo(page);

    // Medido con este camino: con las líneas en otro color, anillos y nombres dan unos 800 píxeles de
    // TINTA; con las líneas oscuras, unos 1800. El umbral queda en medio. El dibujo ya no cambia al
    // recargar la semilla (los nodos llegan ordenados por id), así que estos números se repiten.
    expect(await pixelesDeColor(page, TINTA)).toBeGreaterThan(1_300);
  });

  test('parte de la persona elegida en Actuar como', async ({ page }) => {
    await page.goto('/caminos');
    await expect(page.getByText('Elige desde qué persona')).toBeVisible();

    await page.getByRole('combobox', { name: 'Actuar como' }).fill('kevin');
    await page.getByRole('option', { name: /Kevin Petro/ }).click();
    await page.getByLabel('Empresa de destino').selectOption({ label: 'Estudio Pixel' });

    await expect(page.getByText('A 3 saltos')).toBeVisible();
    await expect(page.getByText('Elige desde qué persona')).toBeHidden();
  });

  test('llega a una oferta a través de quien la publica', async ({ page }) => {
    await page.goto('/caminos?origen=usr-38');

    await page.getByRole('button', { name: 'Oferta' }).click();
    await page.getByLabel('Oferta de destino').selectOption({ label: 'Ingeniero de Grafos Neo4j · AndesData' });

    await expect(page).toHaveURL(/tipo=oferta/);
    await expect(page.getByRole('list').filter({ hasText: 'publicación' })).toContainText('Ingeniero de Grafos Neo4j');
  });

  test('el selector no ofrece ofertas cerradas', async ({ page }) => {
    await page.goto('/caminos?origen=usr-38&tipo=oferta');

    const selector = page.getByLabel('Oferta de destino');
    await expect(selector.getByRole('option', { name: /Ingeniero de Grafos Neo4j/ })).toBeAttached();
    await expect(selector.getByRole('option', { name: /Desarrollador Go/ })).toHaveCount(0);
  });

  test('cambiar de empresa a oferta borra el destino anterior', async ({ page }) => {
    await page.goto(CAMINO_KEVIN);
    await expect(page.getByText('A 3 saltos')).toBeVisible();

    await page.getByRole('button', { name: 'Oferta' }).click();

    await expect(page.getByLabel('Oferta de destino')).toHaveValue('');
    await expect(page.getByText('A 3 saltos')).toBeHidden();
    await expect(page).not.toHaveURL(/destino=/);
  });

  test('cambiar de persona busca de nuevo', async ({ page }) => {
    await page.goto(CAMINO_KEVIN);
    await expect(page.getByText('A 3 saltos')).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await page.getByRole('combobox', { name: 'Buscar persona' }).fill('daniel quintero');
    await page.getByRole('option', { name: /Daniel Quintero/ }).click();

    await expect(page).toHaveURL(/origen=usr-/);
    await expect(page).not.toHaveURL(/origen=usr-38/);
    await expect(page.getByText('A 1 salto', { exact: true })).toBeVisible();
  });

  test('si no hay camino lo dice, sin error', async ({ page }) => {
    await page.goto('/caminos?origen=usr-39&tipo=empresa&destino=emp-06');

    await expect(page.getByText('No hay camino')).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('un destino que no existe se explica', async ({ page }) => {
    await page.goto('/caminos?origen=usr-38&tipo=empresa&destino=no-existe');

    await expect(page.getByRole('alert')).toContainText('no-existe');
  });

  test('dos personas con el mismo nombre en un camino son dos paradas', async ({ page, request }) => {
    const [a, b] = [await crearPorApi(request, 'Tocaya Igual'), await crearPorApi(request, 'Tocaya Igual')];
    await conectarPorApi(request, a.id, b.id);
    await request.put(`/api/usuarios/${b.id}/empleos/emp-06`, { data: { cargo: 'Cargo', desde: '2024-01-01' } });

    await page.goto(`/caminos?origen=${a.id}&tipo=empresa&destino=emp-06`);

    await expect(page.getByText('A 2 saltos')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tocaya Igual' })).toHaveCount(2);
  });

  test('un clic en una empresa o en una oferta la vuelve el destino', async ({ page }) => {
    await page.goto('/caminos?origen=usr-38');
    await esperarGrafo(page);

    await clicEnNodo(page, AMBAR);
    await expect(page).toHaveURL(/tipo=empresa&destino=emp-|destino=emp-/);
    await expect(page.getByText(/^A \d saltos?$/)).toBeVisible();

    await page.goto('/caminos?origen=usr-38');
    await esperarGrafo(page);

    await clicEnNodo(page, ROJO);
    await expect(page).toHaveURL(/destino=of-/);
    await expect(page.getByRole('button', { name: 'Oferta' })).toHaveAttribute('aria-pressed', 'true');
  });

  test('un clic en una persona la vuelve el origen', async ({ page }) => {
    await page.goto('/caminos');
    await esperarGrafo(page);

    await clicEnNodo(page, AZUL);

    await expect(page).toHaveURL(/origen=usr-/);
    await expect(page.getByText('Elige desde qué persona')).toBeHidden();
  });

  test('sin red avisa, y Reintentar recupera', async ({ page }) => {
    await page.route(API, (ruta) => ruta.abort());

    await page.goto('/caminos');

    await expect(page.getByRole('alert')).toContainText('No hay conexión con el servidor', { timeout: 10_000 });

    await page.unroute(API);
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await esperarGrafo(page);
    await expect(page.getByRole('alert')).toBeHidden();
  });
});
