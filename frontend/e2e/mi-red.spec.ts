import { expect, test, type Page } from '@playwright/test';
import {
  API,
  conectarPorApi,
  crearPorApi,
  habilidadPorApi,
  representarA,
  solicitarPorApi,
} from './ayudas';
import limpiarDatosDePrueba from './limpieza';

// Las recomendaciones miran toda la red: no deben quedar personas de otras pruebas.
test.beforeEach(limpiarDatosDePrueba);

const seccion = (page: Page, nombre: string) => page.getByRole('region', { name: nombre, exact: true });

test.describe('Mi red', () => {
  test('sin persona elegida, pide elegir una', async ({ page }) => {
    await page.goto('/mi-red');

    await expect(page.getByText('Para ver tu red, elige a quién representar')).toBeVisible();
  });

  test('aceptar una solicitud pasa a la persona a conexiones', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await solicitarPorApi(request, otra.id, yo.id);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    await expect(seccion(page, 'Solicitudes recibidas')).toContainText(/Desde el \d{1,2} [a-z]{3} \d{4}/);
    await page.getByRole('button', { name: 'Aceptar a Otra Persona' }).click();

    await expect(seccion(page, 'Solicitudes recibidas')).toContainText('No tienes solicitudes pendientes.');
    await expect(seccion(page, 'Conexiones (1)')).toContainText('Otra Persona');
  });

  test('dos clics seguidos en Aceptar no acaban en error', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await solicitarPorApi(request, otra.id, yo.id);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    await page.getByRole('button', { name: 'Aceptar a Otra Persona' }).dblclick();

    await expect(seccion(page, 'Conexiones (1)')).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('rechazar la borra sin conectar', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await solicitarPorApi(request, otra.id, yo.id);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    await page.getByRole('button', { name: 'Rechazar a Otra Persona' }).click();

    await expect(seccion(page, 'Solicitudes recibidas')).toContainText('No tienes solicitudes pendientes.');
    await expect(seccion(page, 'Conexiones (0)')).toContainText('Todavía no tienes conexiones.');
  });

  test('cancelar una enviada la retira', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await solicitarPorApi(request, yo.id, otra.id);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    await page.getByRole('button', { name: 'Cancelar solicitud a Otra Persona' }).click();

    await expect(seccion(page, 'Solicitudes enviadas')).toContainText('No has enviado solicitudes pendientes.');
    const relacion = await (await request.get(`/api/usuarios/${yo.id}/relacion/${otra.id}`)).json();
    expect(relacion).toEqual({ conectados: false, solicitudEnviada: false, solicitudRecibida: false });
  });

  test('sugiere contactos de contactos con el porqué, y Conectar la pasa a enviadas', async ({ page, request }) => {
    const [yo, puente, lejana] = [
      await crearPorApi(request, 'Yo Misma'),
      await crearPorApi(request, 'Puente Común'),
      await crearPorApi(request, 'Lejana Sugerida'),
    ];
    await conectarPorApi(request, yo.id, puente.id);
    await conectarPorApi(request, puente.id, lejana.id);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    const sugeridas = seccion(page, 'Personas que podrías conocer');
    const fila = sugeridas.getByRole('listitem').filter({ hasText: 'Lejana Sugerida' }).first();
    await expect(fila).toContainText('1 contacto en común: Puente Común');
    await expect(fila).toContainText('Viven en la misma ciudad');

    await page.getByRole('button', { name: 'Conectar con Lejana Sugerida' }).click();

    await expect(seccion(page, 'Solicitudes enviadas')).toContainText('Lejana Sugerida');
    await expect(sugeridas).not.toContainText('Lejana Sugerida');
  });

  test('explica el empleo sugerido, y postularse lo pasa a Mis postulaciones', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await habilidadPorApi(request, yo.id, 'python', 5);
    await habilidadPorApi(request, yo.id, 'django', 5);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    const empleos = seccion(page, 'Empleos para ti');
    const fila = empleos.getByRole('listitem').filter({ hasText: 'Desarrollador Python Django' }).first();
    await expect(fila).toContainText(/Cumples: (Django y Python|Python y Django)/);
    await expect(fila).toContainText('Paisa Cloud · remoto');

    await page.getByRole('button', { name: 'Postularme a Desarrollador Python Django' }).click();

    await expect(empleos).not.toContainText('Desarrollador Python Django');
    await expect(seccion(page, 'Mis postulaciones')).toContainText('Desarrollador Python Django');
    await expect(seccion(page, 'Mis postulaciones')).toContainText('enviada');
  });

  test('una obligatoria que falta se marca aparte de las deseables', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await habilidadPorApi(request, yo.id, 'python', 5);
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    const fila = seccion(page, 'Empleos para ti').getByRole('listitem').filter({ hasText: 'Analista de Datos Junior' }).first();

    await expect(fila.getByText('Obligatorias que te faltan: Power BI y SQL')).toBeVisible();
    await expect(fila).not.toContainText('Deseables que te faltan: Power BI');
  });

  test('pagina las conexiones', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    for (let i = 0; i < 11; i++) {
      const otra = await crearPorApi(request, `Contacto ${String(i).padStart(2, '0')}`);
      await conectarPorApi(request, yo.id, otra.id);
    }
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    const conexiones = seccion(page, 'Conexiones (11)');
    await expect(conexiones).toContainText('Página 1 de 2');
    await expect(conexiones).not.toContainText('Contacto 10');

    await conexiones.getByRole('button', { name: 'Siguiente' }).click();

    await expect(conexiones).toContainText('Contacto 10');
    await expect(conexiones).not.toContainText('Contacto 00');
  });

  test('si falla una sección, las demás siguen', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await representarA(page, yo.id);
    await page.route('**/api/usuarios/*/recomendaciones/empleos', (ruta) =>
      ruta.fulfill({ status: 503, json: { codigo: 'BASE_NO_DISPONIBLE', mensaje: 'La base de datos no está disponible' } }),
    );

    await page.goto('/mi-red');

    await expect(seccion(page, 'Empleos para ti').getByRole('alert')).toContainText('La base de datos no está disponible');
    await expect(seccion(page, 'Solicitudes recibidas')).toContainText('No tienes solicitudes pendientes.');
  });
});

test.describe('Perfil frente a la persona representada', () => {
  test('Conectar envía la solicitud, y se puede cancelar', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await representarA(page, yo.id);

    await page.goto(`/personas/${otra.id}`);
    const relacion = page.getByRole('group', { name: 'Relación contigo' });
    await relacion.getByRole('button', { name: 'Conectar' }).click();

    await expect(relacion).toContainText('Solicitud enviada');
    await relacion.getByRole('button', { name: 'Cancelar solicitud' }).click();

    await expect(relacion.getByRole('button', { name: 'Conectar' })).toBeVisible();
  });

  test('a quien te envió solicitud la aceptas desde su perfil', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await solicitarPorApi(request, otra.id, yo.id);
    await representarA(page, yo.id);

    await page.goto(`/personas/${otra.id}`);
    const relacion = page.getByRole('group', { name: 'Relación contigo' });
    await expect(relacion).toContainText('Te envió una solicitud');
    await relacion.getByRole('button', { name: 'Aceptar' }).click();

    await expect(relacion).toContainText('Conectados');
    await expect(page.getByText('1 conexión', { exact: true })).toBeVisible();
  });

  test('si la relación cambió en otra parte, lo dice y se pone al día', async ({ page, request }) => {
    const [yo, otra] = [await crearPorApi(request, 'Yo Misma'), await crearPorApi(request, 'Otra Persona')];
    await representarA(page, yo.id);
    await page.goto(`/personas/${otra.id}`);
    const relacion = page.getByRole('group', { name: 'Relación contigo' });
    await expect(relacion.getByRole('button', { name: 'Conectar' })).toBeVisible();

    await solicitarPorApi(request, otra.id, yo.id);
    await relacion.getByRole('button', { name: 'Conectar' }).click();

    await expect(relacion.getByRole('alert')).toContainText('Esa persona ya te envió una solicitud');
    await expect(relacion.getByRole('button', { name: 'Aceptar' })).toBeVisible();
  });

  test('muestra los contactos en común, y no en el propio perfil', async ({ page, request }) => {
    const [yo, puente, otra] = [
      await crearPorApi(request, 'Yo Misma'),
      await crearPorApi(request, 'Puente Común'),
      await crearPorApi(request, 'Otra Persona'),
    ];
    await conectarPorApi(request, yo.id, puente.id);
    await conectarPorApi(request, puente.id, otra.id);
    await representarA(page, yo.id);

    await page.goto(`/personas/${otra.id}`);
    const comunes = seccion(page, 'Contactos en común');
    await expect(comunes).toContainText('Con Yo Misma');
    await comunes.getByRole('link', { name: 'Puente Común' }).click();
    await expect(page).toHaveURL(new RegExp(`/personas/${puente.id}$`));

    await page.goto(`/personas/${yo.id}`);
    await expect(page.getByRole('heading', { name: 'Yo Misma', level: 1 })).toBeVisible();
    await expect(seccion(page, 'Contactos en común')).toHaveCount(0);
    await expect(page.getByRole('group', { name: 'Relación contigo' })).toHaveCount(0);
  });

  test('sin persona elegida no hay botones de relación', async ({ page }) => {
    await page.goto('/personas/usr-20');

    await expect(page.getByRole('heading', { name: 'Nicolás Cárdenas', level: 1 })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Relación contigo' })).toHaveCount(0);
  });

  test('muestra a quien tiene habilidades parecidas', async ({ page }) => {
    await page.goto('/personas/usr-20');

    const fila = seccion(page, 'Habilidades parecidas').getByRole('listitem').first();
    await expect(fila).toContainText('Esteban Restrepo');
    // Exacto: "0.83 %" también contiene "83 %".
    await expect(fila.getByText('83 %', { exact: true })).toBeVisible();
  });
});

test.describe('Editar vínculos desde el perfil', () => {
  test('agrega una habilidad, cambia su nivel y la quita', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await page.goto(`/personas/${yo.id}`);
    const habilidades = seccion(page, 'Habilidades');

    await page.getByRole('button', { name: 'Editar habilidades' }).click();
    await habilidades.getByRole('button', { name: 'Agregar' }).click();
    await expect(habilidades.getByText('Elige una habilidad', { exact: true }).last()).toBeVisible();

    await habilidades.getByLabel('Habilidad nueva').selectOption({ label: 'Neo4j' });
    await habilidades.getByLabel('Nivel', { exact: true }).selectOption('5');
    await habilidades.getByRole('button', { name: 'Agregar' }).click();
    await expect(habilidades.getByLabel('Nivel de Neo4j')).toHaveValue('5');
    await expect(habilidades.getByLabel('Habilidad nueva').getByRole('option', { name: 'Neo4j' })).toHaveCount(0);

    await habilidades.getByLabel('Nivel de Neo4j').selectOption('2');
    await page.getByRole('button', { name: 'Terminar de editar habilidades' }).click();
    await expect(habilidades.getByRole('img', { name: 'Nivel 2 de 5' })).toBeVisible();

    await page.getByRole('button', { name: 'Editar habilidades' }).click();
    await habilidades.getByRole('button', { name: 'Quitar Neo4j' }).click();
    await expect(habilidades).toContainText('Sin habilidades registradas.');
  });

  test('una habilidad nueva cambia los empleos sugeridos', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await representarA(page, yo.id);

    await page.goto('/mi-red');
    await expect(seccion(page, 'Empleos para ti')).not.toContainText('Desarrollador Python Django');

    await page.goto(`/personas/${yo.id}`);
    await page.getByRole('button', { name: 'Editar habilidades' }).click();
    for (const nombre of ['Python', 'Django']) {
      await seccion(page, 'Habilidades').getByLabel('Habilidad nueva').selectOption({ label: nombre });
      await seccion(page, 'Habilidades').getByLabel('Nivel', { exact: true }).selectOption('5');
      await seccion(page, 'Habilidades').getByRole('button', { name: 'Agregar' }).click();
      await expect(seccion(page, 'Habilidades').getByLabel(`Nivel de ${nombre}`)).toBeVisible();
    }
    await page.getByRole('link', { name: 'Mi red', exact: true }).click();

    await expect(seccion(page, 'Empleos para ti')).toContainText('Desarrollador Python Django');
  });

  test('agrega un empleo con errores en español, y lo quita', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await page.goto(`/personas/${yo.id}`);
    const empleos = seccion(page, 'Empleos');

    await page.getByRole('button', { name: 'Editar empleos' }).click();
    await empleos.getByLabel('Empresa').selectOption({ label: 'FinTrust' });
    await empleos.getByRole('button', { name: 'Agregar empleo' }).click();
    await expect(empleos.getByText('El cargo es obligatorio')).toBeVisible();
    await expect(empleos.getByText('Usa una fecha real con formato AAAA-MM-DD')).toBeVisible();

    await empleos.getByLabel('Cargo').fill('Analista');
    await empleos.getByLabel('Desde').fill('2024-02-01');
    await empleos.getByRole('button', { name: 'Agregar empleo' }).click();

    await expect(empleos).toContainText('FinTrust · desde feb 2024 · actual');
    await expect(empleos.getByText('El cargo es obligatorio')).toBeHidden();
    await expect(empleos.getByLabel('Empresa').getByRole('option', { name: 'FinTrust' })).toHaveCount(0);

    await empleos.getByRole('button', { name: 'Quitar empleo en FinTrust' }).click();
    await expect(empleos).toContainText('Sin empleos registrados.');
  });

  test('un empleo sin empresa elegida no llega al servidor', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    let puts = 0;
    page.on('request', (r) => {
      if (r.method() === 'PUT') puts++;
    });

    await page.goto(`/personas/${yo.id}`);
    await page.getByRole('button', { name: 'Editar empleos' }).click();
    await seccion(page, 'Empleos').getByRole('button', { name: 'Agregar empleo' }).click();

    await expect(seccion(page, 'Empleos').getByText('Elige una empresa', { exact: true }).last()).toBeVisible();
    expect(puts).toBe(0);
  });

  test('agrega un proyecto con su rol, y lo quita', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await page.goto(`/personas/${yo.id}`);
    const proyectos = seccion(page, 'Proyectos');

    await page.getByRole('button', { name: 'Editar proyectos' }).click();
    await proyectos.getByLabel('Proyecto', { exact: true }).selectOption({ label: 'App Móvil de Entregas' });
    await proyectos.getByRole('button', { name: 'Agregar proyecto' }).click();
    await expect(proyectos.getByText('El rol es obligatorio')).toBeVisible();

    await proyectos.getByLabel('Rol').fill('Backend');
    await proyectos.getByRole('button', { name: 'Agregar proyecto' }).click();
    await expect(proyectos).toContainText('Backend · en curso');

    await proyectos.getByRole('button', { name: 'Quitar proyecto App Móvil de Entregas' }).click();
    await expect(proyectos).toContainText('Sin proyectos registrados.');
  });

  test('sin red, quitar avisa y conserva el vínculo', async ({ page, request }) => {
    const yo = await crearPorApi(request, 'Yo Misma');
    await habilidadPorApi(request, yo.id, 'python', 4);

    await page.goto(`/personas/${yo.id}`);
    await page.getByRole('button', { name: 'Editar habilidades' }).click();
    await page.route(API, (ruta) => ruta.abort());
    await page.getByRole('button', { name: 'Quitar Python' }).click();

    const fila = seccion(page, 'Habilidades').getByRole('listitem').filter({ hasText: 'Python' });
    await expect(fila.getByRole('alert')).toContainText('No hay conexión con el servidor');
    await expect(seccion(page, 'Habilidades').getByLabel('Nivel de Python')).toHaveValue('4');
    // El catálogo no se vuelve a pedir tras una escritura: el formulario de abajo sigue sin error.
    await expect(seccion(page, 'Habilidades').locator('form').getByRole('alert')).toHaveCount(0);
  });
});
