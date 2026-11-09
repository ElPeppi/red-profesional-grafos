import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { crearPorApi, habilidadPorApi, representarA } from './ayudas';
import limpiarDatosDePrueba, { MARCA } from './limpieza';

test.beforeEach(limpiarDatosDePrueba);
test.afterAll(limpiarDatosDePrueba);

const seccion = (page: Page, nombre: string) => page.getByRole('region', { name: nombre, exact: true });

async function empresaPorApi(request: APIRequestContext, nombre = `${MARCA}Empresa`) {
  const respuesta = await request.post('/api/empresas', { data: { nombre, sector: 'Pruebas', ciudadId: 'cali' } });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()) as { id: string };
}

async function ofertaPorApi(request: APIRequestContext, empresaId: string, titulo = `${MARCA}Oferta`) {
  const respuesta = await request.post('/api/ofertas', {
    data: { titulo, empresaId, ciudadId: 'cali', nivel: 'junior', modalidad: 'remoto' },
  });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()) as { id: string };
}

test.describe('Empresas', () => {
  test('el perfil muestra ofertas y proyectos, y lleva a cada uno', async ({ page }) => {
    await page.goto('/empresas');
    await page.getByRole('link', { name: /AndesData/ }).click();

    await expect(page.getByRole('heading', { name: 'AndesData', level: 1 })).toBeVisible();
    await expect(page.getByText('4 personas trabajan aquí')).toBeVisible();
    await expect(seccion(page, 'Proyectos')).toContainText('Grafo Antifraude');

    await seccion(page, 'Ofertas').getByRole('link', { name: 'Ingeniero de Grafos Neo4j' }).click();
    await expect(page.getByRole('heading', { name: 'Ingeniero de Grafos Neo4j', level: 1 })).toBeVisible();
  });

  test('crea con errores en español, edita y borra', async ({ page }) => {
    await page.goto('/empresas/nueva');
    await page.getByRole('button', { name: 'Crear empresa' }).click();
    await expect(page.getByText('El nombre es obligatorio')).toBeVisible();
    await expect(page.getByText('El sector es obligatorio')).toBeVisible();
    await expect(page.getByText('La ciudad es obligatoria')).toBeVisible();

    await page.getByLabel('Nombre').fill(`${MARCA}Café Digital`);
    await page.getByLabel('Sector').fill('Software');
    await page.getByLabel('Ciudad').selectOption({ label: 'Montería' });
    await page.getByRole('button', { name: 'Crear empresa' }).click();
    await expect(page.getByRole('heading', { name: `${MARCA}Café Digital`, level: 1 })).toBeVisible();
    await expect(page.getByText('Montería, Córdoba')).toBeVisible();

    await page.getByRole('link', { name: 'Editar' }).click();
    await page.getByLabel('Sector').fill('Agrotech');
    const pedido = page.waitForRequest((r) => r.method() === 'PATCH');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();
    expect((await pedido).postDataJSON()).toEqual({ sector: 'Agrotech' });
    await expect(page.getByText('Agrotech')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page).toHaveURL(/\/empresas$/);
  });

  test('una página que ya no existe cae en la última', async ({ page }) => {
    await page.goto('/empresas?pagina=99');

    await expect(page).not.toHaveURL(/pagina=99/);
    await expect(page.getByRole('link', { name: /AndesData/ })).toBeVisible();
  });

  test('con ofertas no se borra, y lo explica', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);
    await ofertaPorApi(request, empresa.id);

    await page.goto(`/empresas/${empresa.id}`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();

    await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
      'Ofertas publicadas por la empresa: 1. Bórralas primero',
    );
    expect((await request.get(`/api/empresas/${empresa.id}`)).status()).toBe(200);
  });

  test('publicar oferta desde la empresa la deja elegida', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);

    await page.goto(`/empresas/${empresa.id}`);
    await page.getByRole('link', { name: 'Publicar oferta' }).click();

    await expect(page.getByLabel('Empresa', { exact: true })).toHaveValue(empresa.id);
  });
});

test.describe('Ofertas', () => {
  test('filtra por estado desde la URL', async ({ page }) => {
    await page.goto('/ofertas');
    await expect(page.getByText('14 ofertas')).toBeVisible();
    await expect(page.getByRole('link', { name: /Desarrollador Go/ })).toHaveCount(0);

    await page.getByRole('button', { name: 'Cerradas' }).click();

    await expect(page).toHaveURL(/estado=cerrada/);
    await expect(page.getByText('1 oferta', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Desarrollador Go/ })).toBeVisible();

    await page.getByRole('button', { name: 'Todas' }).click();
    await expect(page.getByText('15 ofertas')).toBeVisible();
  });

  test('crea una oferta y edita sus requisitos', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);

    await page.goto(`/ofertas/nueva?empresa=${empresa.id}`);
    await page.getByLabel('Título').fill(`${MARCA}Analista Neo4j`);
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByLabel('Modalidad').selectOption('remoto');
    await page.getByRole('button', { name: 'Publicar oferta' }).click();
    await expect(page.getByRole('heading', { name: `${MARCA}Analista Neo4j`, level: 1 })).toBeVisible();

    const requisitos = seccion(page, 'Requisitos');
    await page.getByRole('button', { name: 'Editar requisitos' }).click();
    await requisitos.getByRole('button', { name: 'Agregar requisito' }).click();
    await expect(requisitos.getByText('Elige una habilidad', { exact: true }).last()).toBeVisible();

    await requisitos.getByLabel('Habilidad requerida').selectOption({ label: 'Neo4j' });
    await requisitos.getByLabel('Nivel mínimo', { exact: true }).selectOption('4');
    await requisitos.getByRole('button', { name: 'Agregar requisito' }).click();
    await expect(requisitos.getByLabel('Nivel mínimo de Neo4j')).toHaveValue('4');

    await requisitos.getByLabel('Habilidad requerida').selectOption({ label: 'SQL' });
    await requisitos.getByLabel('Es obligatoria', { exact: true }).uncheck();
    await requisitos.getByRole('button', { name: 'Agregar requisito' }).click();
    await expect(requisitos.getByLabel('Nivel mínimo de SQL')).toBeVisible();

    await requisitos.getByLabel('Nivel mínimo de Neo4j').selectOption('2');
    await page.getByRole('button', { name: 'Terminar de editar requisitos' }).click();
    await expect(requisitos.getByRole('listitem').filter({ hasText: 'Neo4j' })).toContainText('nivel 2 o más');
    await expect(requisitos.getByRole('listitem').filter({ hasText: 'Neo4j' })).toContainText('obligatoria');
    await expect(requisitos.getByRole('listitem').filter({ hasText: 'SQL' })).toContainText('deseable');

    await page.getByRole('button', { name: 'Editar requisitos' }).click();
    await requisitos.getByRole('button', { name: 'Quitar SQL' }).click();
    await expect(requisitos.getByRole('listitem').filter({ hasText: 'SQL' })).toHaveCount(0);
  });

  test('cambiar si es obligatoria conserva el nivel mínimo', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);
    const oferta = await ofertaPorApi(request, empresa.id);
    await request.put(`/api/ofertas/${oferta.id}/habilidades/go`, { data: { nivelMinimo: 4, obligatoria: true } });

    await page.goto(`/ofertas/${oferta.id}`);
    await page.getByRole('button', { name: 'Editar requisitos' }).click();
    await seccion(page, 'Requisitos').getByRole('checkbox', { name: 'Go es obligatoria' }).uncheck();
    await page.getByRole('button', { name: 'Terminar de editar requisitos' }).click();

    const fila = seccion(page, 'Requisitos').getByRole('listitem').filter({ hasText: 'Go' });
    await expect(fila).toContainText('deseable');
    await expect(fila).toContainText('nivel 4 o más');
  });

  test('sugiere candidatos con su porqué', async ({ page }) => {
    await page.goto('/ofertas/of-06');

    const primero = seccion(page, 'Candidatos sugeridos').getByRole('listitem').first();
    await expect(primero).toContainText('Alejandro Suárez');
    await expect(primero).toContainText('ajuste 80 %');
    await expect(primero).toContainText('Conoce ahí a Mariana López');
    await expect(
      seccion(page, 'Candidatos sugeridos').getByText('Obligatorias que le faltan: Neo4j', { exact: true }).first(),
    ).toBeVisible();
    // A Eduardo solo le falta Neo4j, que es obligatoria: no debe salir también como deseable.
    const eduardo = seccion(page, 'Candidatos sugeridos').getByRole('listitem').filter({ hasText: 'Eduardo Espitia' }).first();
    await expect(eduardo).not.toContainText('Deseables');
  });

  test('postularse la suma a postulantes, y el estado se cambia y se conserva', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);
    const oferta = await ofertaPorApi(request, empresa.id);
    const yo = await crearPorApi(request, 'Yo Misma');
    await representarA(page, yo.id);

    await page.goto(`/ofertas/${oferta.id}`);
    await page.getByRole('button', { name: 'Postularme' }).click();

    await expect(page.getByText('Yo Misma ya se postuló')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Postularme' })).toHaveCount(0);
    const postulantes = seccion(page, 'Postulantes (1)');
    await postulantes.getByLabel('Estado de Yo Misma').selectOption('entrevista');
    await expect(postulantes.getByLabel('Estado de Yo Misma')).toHaveValue('entrevista');

    await page.reload();
    await expect(seccion(page, 'Postulantes (1)').getByLabel('Estado de Yo Misma')).toHaveValue('entrevista');
  });

  test('borrar a una persona la saca de los postulantes aunque la oferta siga en caché', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);
    const titulo = `${MARCA}Oferta en caché`;
    const oferta = await ofertaPorApi(request, empresa.id, titulo);
    const persona = await crearPorApi(request, 'Postulante Borrada');
    const postulacion = await request.post(`/api/ofertas/${oferta.id}/postulaciones`, { data: { usuarioId: persona.id } });
    expect(postulacion.status()).toBe(201);

    await page.goto(`/ofertas/${oferta.id}`);
    await seccion(page, 'Postulantes (1)').getByRole('link', { name: 'Postulante Borrada' }).click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page).toHaveURL(/\/personas$/);

    // Sin recargar: la oferta sale de la caché del navegador, pedida hace menos de 10 s.
    await page.getByRole('link', { name: 'Ofertas' }).first().click();
    await page.getByRole('link').filter({ has: page.getByText(titulo, { exact: true }) }).click();
    await expect(seccion(page, 'Postulantes (0)')).toBeVisible();
  });

  test('quien se postula sale de los candidatos', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);
    const oferta = await ofertaPorApi(request, empresa.id);
    await request.put(`/api/ofertas/${oferta.id}/habilidades/go`, { data: { nivelMinimo: 3, obligatoria: true } });
    const yo = await crearPorApi(request, 'Candidata Go');
    await habilidadPorApi(request, yo.id, 'go', 5);
    await request.patch(`/api/usuarios/${yo.id}`, { data: { abiertoAOfertas: true } });
    await representarA(page, yo.id);

    await page.goto(`/ofertas/${oferta.id}`);
    await expect(seccion(page, 'Candidatos sugeridos')).toContainText('Candidata Go');
    await page.getByRole('button', { name: 'Postularme' }).click();

    await expect(seccion(page, 'Postulantes (1)')).toContainText('Candidata Go');
    await expect(seccion(page, 'Candidatos sugeridos')).not.toContainText('Candidata Go');
  });

  test('cerrar la oferta quita Postularme y los candidatos; reabrir los devuelve', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    const empresa = await empresaPorApi(request);
    const oferta = await ofertaPorApi(request, empresa.id);
    await representarA(page, yo.id);

    await page.goto(`/ofertas/${oferta.id}`);
    await page.getByRole('button', { name: 'Cerrar oferta' }).click();

    await expect(page.getByRole('button', { name: 'Reabrir oferta' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Postularme' })).toHaveCount(0);
    await expect(seccion(page, 'Candidatos sugeridos')).toContainText('La oferta está cerrada');

    await page.getByRole('button', { name: 'Reabrir oferta' }).click();
    await expect(page.getByRole('button', { name: 'Postularme' })).toBeVisible();
  });

  test('borrar una oferta vuelve a la lista', async ({ page, request }) => {
    const empresa = await empresaPorApi(request);
    const oferta = await ofertaPorApi(request, empresa.id, `${MARCA}Para borrar`);

    await page.goto(`/ofertas/${oferta.id}`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    // Al borrar se sale de la página sin mostrar en ningún momento que la oferta no existe.
    const dijoQueNoExiste = page
      .waitForSelector('text=Esta oferta no existe.', { state: 'attached', timeout: 3_000 })
      .then(() => true)
      .catch(() => false);
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();

    await expect(page).toHaveURL(/\/ofertas$/);
    expect(await dijoQueNoExiste).toBe(false);
    expect((await request.get(`/api/ofertas/${oferta.id}`)).status()).toBe(404);
  });

  test('una oferta que no existe se dice', async ({ page }) => {
    await page.goto('/ofertas/no-existe');

    await expect(page.getByText('Esta oferta no existe.')).toBeVisible();
  });
});

test.describe('Proyectos', () => {
  test('el detalle muestra tecnologías, miembros y colaboradores con porqué', async ({ page }) => {
    await page.goto('/proyectos/prj-02');

    await expect(seccion(page, 'Tecnologías')).toContainText('TypeScript');
    await expect(seccion(page, 'Miembros (5)')).toContainText('Andrea Pérez');
    const primero = seccion(page, 'Colaboradores sugeridos').getByRole('listitem').first();
    await expect(primero).toContainText('Jorge Barrios');
    await expect(primero).toContainText('ajuste 72 %');
    await expect(primero).toContainText('Conoce a Carlos Mejía y Valentina Ruiz del equipo');
  });

  test('lista parejas relacionadas que llevan a cada proyecto', async ({ page }) => {
    await page.goto('/proyectos');

    const par = seccion(page, 'Proyectos relacionados')
      .getByRole('listitem')
      .filter({ hasText: 'Scoring Crediticio con ML' })
      .filter({ hasText: 'Lago de Datos Retail' })
      .first();
    await expect(par).toContainText('Tecnologías en común');
    await par.getByRole('link', { name: 'Lago de Datos Retail' }).click();

    await expect(page.getByRole('heading', { name: 'Lago de Datos Retail', level: 1 })).toBeVisible();
  });

  test('crea un proyecto comunitario, le suma tecnología y miembro, y lo borra', async ({ page, request }) => {
    await crearPorApi(request, 'Miembro Nuevo');

    await page.goto('/proyectos/nuevo');
    await page.getByLabel('Nombre').fill(`${MARCA}Huerta Abierta`);
    await page.getByLabel('Descripción').fill('Sensores para huertas comunitarias');
    await page.getByRole('button', { name: 'Crear proyecto' }).click();
    await expect(page.getByRole('heading', { name: `${MARCA}Huerta Abierta`, level: 1 })).toBeVisible();
    await expect(page.getByText('Comunitario')).toBeVisible();

    await page.getByRole('button', { name: 'Editar tecnologías' }).click();
    await seccion(page, 'Tecnologías').getByLabel('Tecnología nueva').selectOption({ label: 'Python' });
    await seccion(page, 'Tecnologías').getByRole('button', { name: 'Agregar' }).click();
    await expect(seccion(page, 'Tecnologías').getByRole('listitem').filter({ hasText: 'Python' })).toBeVisible();

    await page.getByRole('button', { name: 'Editar miembros' }).click();
    const miembros = seccion(page, 'Miembros (0)');
    await miembros.getByRole('button', { name: 'Agregar miembro' }).click();
    await expect(miembros.getByText('Elige una persona')).toBeVisible();
    await miembros.getByRole('combobox', { name: 'Buscar persona' }).fill('miembro nuevo');
    await page.getByRole('option', { name: /Miembro Nuevo/ }).click();
    await miembros.getByRole('button', { name: 'Agregar miembro' }).click();
    await expect(miembros.getByText('El rol es obligatorio')).toBeVisible();
    await miembros.getByLabel('Rol').fill('Hardware');
    await miembros.getByRole('button', { name: 'Agregar miembro' }).click();
    await expect(seccion(page, 'Miembros (1)')).toContainText('Hardware');

    await seccion(page, 'Miembros (1)').getByRole('button', { name: 'Quitar a Miembro Nuevo' }).click();
    await expect(seccion(page, 'Miembros (0)')).toContainText('Nadie participa todavía.');

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
    await expect(page).toHaveURL(/\/proyectos$/);
  });

  test('editar cambia el estado, y uno terminado no busca colaboradores', async ({ page, request }) => {
    const respuesta = await request.post('/api/proyectos', { data: { nombre: `${MARCA}Terminado` } });
    const { id } = (await respuesta.json()) as { id: string };
    await request.put(`/api/proyectos/${id}/habilidades/python`);

    await page.goto(`/proyectos/${id}/editar`);
    await page.getByLabel('Estado').selectOption('finalizado');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('finalizado', { exact: true })).toBeVisible();
    await expect(seccion(page, 'Colaboradores sugeridos')).toContainText('El proyecto terminó');
  });
});

test.describe('Enlaces entre vistas', () => {
  test('en Caminos, la empresa del camino lleva a su página', async ({ page }) => {
    await page.goto('/caminos?origen=usr-38&tipo=empresa&destino=emp-06');

    await page.getByRole('list').filter({ hasText: 'Marcela Doria' }).getByRole('link', { name: 'Estudio Pixel' }).click();

    await expect(page.getByRole('heading', { name: 'Estudio Pixel', level: 1 })).toBeVisible();
  });

  test('desde la empresa, Camino hasta aquí la deja como destino', async ({ page }) => {
    await representarA(page, 'usr-38');
    await page.goto('/empresas/emp-06');

    await page.getByRole('link', { name: 'Camino hasta aquí' }).click();

    await expect(page.getByText('A 3 saltos')).toBeVisible();
  });

  test('en el perfil, el empleo y el proyecto llevan a su página', async ({ page }) => {
    await page.goto('/personas/usr-01');

    await seccion(page, 'Empleos').getByRole('link', { name: 'Caribe Software' }).click();
    await expect(page.getByRole('heading', { name: 'Caribe Software', level: 1 })).toBeVisible();

    await page.goto('/personas/usr-01');
    await seccion(page, 'Proyectos').getByRole('link', { name: 'Portal de Clientes Caribe' }).click();
    await expect(page.getByRole('heading', { name: 'Portal de Clientes Caribe', level: 1 })).toBeVisible();
  });

  test('en Mi red, el empleo sugerido lleva a la oferta', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await habilidadPorApi(request, yo.id, 'python', 5);
    await habilidadPorApi(request, yo.id, 'django', 5);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    await seccion(page, 'Empleos para ti').getByRole('link', { name: 'Desarrollador Python Django' }).click();

    await expect(page.getByRole('heading', { name: 'Desarrollador Python Django', level: 1 })).toBeVisible();
  });
});
