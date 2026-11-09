import { expect, test, type Page } from '@playwright/test';
import { API, crearPorApi, emailDePrueba } from './ayudas';

const CLAVE_ACTUAL = 'red-profesional:usuario-actual';
const SIN_CONEXION = 'No hay conexión con el servidor';

const selectorDeUsuario = (page: Page) => page.getByRole('combobox', { name: 'Actuar como' });

// El enlace, no el texto: mientras se elige, el nombre también sale en la lista desplegable.
const enCabecera = (page: Page, nombre: string) => page.getByRole('banner').getByRole('link', { name: nombre });

async function actuarComo(page: Page, texto: string, nombre: string) {
  await selectorDeUsuario(page).fill(texto);
  await page.getByRole('option', { name: nombre }).click();
}

test.describe('Listado y búsqueda', () => {
  test('pagina con la URL, y atrás vuelve a la página anterior', async ({ page }) => {
    await page.goto('/personas');
    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeVisible();

    await page.getByRole('button', { name: 'Siguiente' }).click();

    await expect(page).toHaveURL(/pagina=2/);
    await expect(page.getByText('Página 2 de')).toBeVisible();
    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeHidden();

    await page.goBack();
    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeVisible();
  });

  test('una página que ya no existe cae en la última', async ({ page }) => {
    await page.goto('/personas?pagina=999');

    await expect(page).toHaveURL(/pagina=\d$/);
    await expect(page).not.toHaveURL(/pagina=999/);
    await expect(page.getByRole('list').getByRole('link').first()).toBeVisible();
  });

  test('una página inválida en la URL vale la primera', async ({ page }) => {
    await page.goto('/personas?pagina=abc');

    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeVisible();
  });

  test('encuentra sin tilde, y la búsqueda sobrevive a recargar', async ({ page }) => {
    await page.goto('/personas');

    await page.getByRole('searchbox', { name: 'Buscar personas' }).fill('mejia');

    await expect(page.getByRole('link', { name: /Carlos Mejía/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeHidden();
    await expect(page).toHaveURL(/q=mejia/);

    await page.reload();

    await expect(page.getByRole('searchbox', { name: 'Buscar personas' })).toHaveValue('mejia');
    await expect(page.getByRole('link', { name: /Carlos Mejía/ })).toBeVisible();
  });

  test('consulta al dejar de teclear, no en cada tecla', async ({ page }) => {
    const buscadas: string[] = [];
    page.on('request', (r) => {
      const busqueda = new URL(r.url()).searchParams.get('busqueda');
      if (busqueda) buscadas.push(busqueda);
    });

    await page.goto('/personas');
    await page.getByRole('searchbox', { name: 'Buscar personas' }).pressSequentially('mejia', { delay: 30 });

    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeHidden();
    expect(buscadas).toEqual(['mejia']);
  });

  test('buscar desde la página 2 vuelve a la 1, aunque haya varias páginas', async ({ page }) => {
    // Con pocos resultados pasaría igual: el tope de página también lleva a la 1.
    await page.route('**/api/usuarios?*busqueda=*', async (ruta) => {
      const respuesta = await ruta.fetch();
      await ruta.fulfill({ response: respuesta, json: { ...(await respuesta.json()), total: 50 } });
    });
    await page.goto('/personas?pagina=2');

    await page.getByRole('searchbox', { name: 'Buscar personas' }).fill('mejia');

    await expect(page.getByText('Página 1 de 5')).toBeVisible();
    await expect(page).not.toHaveURL(/pagina=/);
  });

  test('sin resultados lo dice, también con caracteres de Lucene', async ({ page }) => {
    await page.goto('/personas');
    const buscador = page.getByRole('searchbox', { name: 'Buscar personas' });

    await buscador.fill('zzzzqqqq');
    await expect(page.getByText('Nadie coincide con «zzzzqqqq».')).toBeVisible();

    await buscador.fill('"(:*');
    await expect(page.getByText('Nadie coincide')).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });
});

test.describe('Crear, editar y borrar', () => {
  test('recorre el ciclo completo de una persona', async ({ page }) => {
    const email = emailDePrueba();

    await page.goto('/personas');
    await page.getByRole('link', { name: 'Nueva persona' }).click();
    await page.getByLabel('Nombre').fill('Ñoño Díaz');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Titular').fill('Probador de ciclos');
    await page.getByLabel('Ciudad').selectOption({ label: 'Montería' });
    await page.getByLabel('Años de experiencia').fill('1');
    await page.getByLabel('Abierto a ofertas').check();
    await page.getByRole('button', { name: 'Crear persona' }).click();

    await expect(page.getByRole('heading', { name: 'Ñoño Díaz', level: 1 })).toBeVisible();
    await expect(page.getByText('Montería, Córdoba')).toBeVisible();
    await expect(page.getByText('1 año de experiencia')).toBeVisible();
    await expect(page.getByText('0 conexiones')).toBeVisible();

    await page.getByRole('link', { name: 'Editar' }).click();
    await expect(page.getByLabel('Ciudad')).toHaveValue('monteria');
    await page.getByLabel('Nombre').fill('Ñoño Díaz Editado');
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByLabel('Abierto a ofertas').uncheck();
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('heading', { name: 'Ñoño Díaz Editado', level: 1 })).toBeVisible();
    await expect(page.getByText('Cali, Valle del Cauca')).toBeVisible();
    await expect(page.getByText('Abierto a ofertas')).toBeHidden();

    await page.goto('/personas?q=Ñoño');
    await page.getByRole('link', { name: /Ñoño Díaz Editado/ }).click();
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();

    await expect(page).toHaveURL(/\/personas$/);
    await page.getByRole('searchbox', { name: 'Buscar personas' }).fill('Ñoño');
    await expect(page.getByText('Nadie coincide')).toBeVisible();
  });

  test('lo creado aparece en la lista sin recargar', async ({ page }) => {
    await page.goto('/personas');
    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeVisible();

    await page.getByRole('link', { name: 'Nueva persona' }).click();
    await page.getByLabel('Nombre').fill('Aaron Primero');
    await page.getByLabel('Email').fill(emailDePrueba());
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByRole('button', { name: 'Crear persona' }).click();
    await expect(page.getByRole('heading', { name: 'Aaron Primero', level: 1 })).toBeVisible();

    await page.getByRole('navigation', { name: 'Principal' }).getByRole('link', { name: 'Personas' }).click();

    await expect(page.getByRole('link', { name: /Aaron Primero/ })).toBeVisible();
  });

  test('dos clics seguidos crean una sola persona', async ({ page }) => {
    let creaciones = 0;
    await page.route('**/api/usuarios', async (ruta) => {
      creaciones++;
      await new Promise((r) => setTimeout(r, 300));
      await ruta.continue();
    });

    await page.goto('/personas/nueva');
    await page.getByLabel('Nombre').fill('Clic Doble');
    await page.getByLabel('Email').fill(emailDePrueba());
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByRole('button', { name: 'Crear persona' }).dblclick();

    await expect(page.getByRole('heading', { name: 'Clic Doble', level: 1 })).toBeVisible();
    expect(creaciones).toBe(1);
  });

  test('dos clics seguidos en Eliminar no acaban en error', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Doble Adiós');

    await page.goto(`/personas/${id}`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).dblclick();

    await expect(page).toHaveURL(/\/personas$/);
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('cancelar el diálogo no borra', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Sigo Aquí');

    await page.goto(`/personas/${id}`);
    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar' }).click();

    await expect(page.getByRole('dialog')).toBeHidden();
    expect((await request.get(`/api/usuarios/${id}`)).status()).toBe(200);
  });

  test('los errores de validación salen junto a cada campo y en español', async ({ page }) => {
    await page.goto('/personas/nueva');
    await page.getByLabel('Email').fill('sin-arroba');
    await page.getByLabel('Años de experiencia').fill('200');

    await page.getByRole('button', { name: 'Crear persona' }).click();

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible();
    await expect(page.getByText('Email inválido')).toBeVisible();
    await expect(page.getByText('La ciudad es obligatoria')).toBeVisible();
    await expect(page.getByText('No puede pasar de 80')).toBeVisible();
    await expect(page.getByLabel('Email')).toHaveAttribute('aria-invalid', 'true');
    await expect(page).toHaveURL(/nueva$/);
  });

  test('también en español al editar', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Sin Vaciar');

    await page.goto(`/personas/${id}/editar`);
    await page.getByLabel('Nombre').fill('');
    await page.getByLabel('Años de experiencia').fill('2.5');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByText('El nombre es obligatorio')).toBeVisible();
    await expect(page.getByText('Escribe un número entero')).toBeVisible();
  });

  test('tras un error se puede corregir y volver a enviar', async ({ page }) => {
    await page.goto('/personas/nueva');
    await page.getByRole('button', { name: 'Crear persona' }).click();
    await expect(page.getByText('El nombre es obligatorio')).toBeVisible();

    await page.getByLabel('Nombre').fill('Segundo Intento');
    await page.getByLabel('Email').fill(emailDePrueba());
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByRole('button', { name: 'Crear persona' }).click();

    await expect(page.getByRole('heading', { name: 'Segundo Intento', level: 1 })).toBeVisible();
  });

  test('un email repetido se marca en su campo', async ({ page, request }) => {
    const { email } = await crearPorApi(request, 'Primera');

    await page.goto('/personas/nueva');
    await page.getByLabel('Nombre').fill('Segunda');
    await page.getByLabel('Email').fill(email.toUpperCase());
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });
    await page.getByRole('button', { name: 'Crear persona' }).click();

    await expect(page.getByText('Ya existe una persona con ese email')).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('editar manda solo lo que cambió', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Solo Titular');

    await page.goto(`/personas/${id}/editar`);
    await page.getByLabel('Titular').fill('Otro titular');
    const pedido = page.waitForRequest((r) => r.method() === 'PATCH');
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    expect((await pedido).postDataJSON()).toEqual({ titular: 'Otro titular' });
    await expect(page.getByRole('heading', { name: 'Solo Titular', level: 1 })).toBeVisible();
  });

  test('guardar sin cambios no llama a la API', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Sin Cambios');
    let patches = 0;
    page.on('request', (r) => {
      if (r.method() === 'PATCH') patches++;
    });

    await page.goto(`/personas/${id}/editar`);
    await page.getByRole('button', { name: 'Guardar cambios' }).click();

    await expect(page.getByRole('heading', { name: 'Sin Cambios', level: 1 })).toBeVisible();
    expect(patches).toBe(0);
  });
});

test.describe('Perfil', () => {
  test('muestra la red de la persona, con la fecha sin correrse de mes', async ({ page }) => {
    await page.goto('/personas/usr-01');

    await expect(page.getByRole('heading', { name: 'Andrea Pérez', level: 1 })).toBeVisible();
    await expect(page.getByText('4 conexiones')).toBeVisible();
    await expect(page.getByText('Caribe Software · desde feb 2022 · actual')).toBeVisible();
    await expect(page.getByText('Portal de Clientes Caribe')).toBeVisible();
    await expect(page.getByRole('img', { name: 'Nivel 3 de 5' })).toBeVisible();
  });

  test('una persona que no existe se dice sin errores', async ({ page }) => {
    await page.goto('/personas/no-existe');

    await expect(page.getByText('Esta persona no existe.')).toBeVisible();
  });

  test('un 404 no se reintenta: la respuesta sería la misma', async ({ page }) => {
    let pedidos = 0;
    page.on('request', (r) => {
      if (r.url().endsWith('/api/usuarios/no-existe')) pedidos++;
    });

    await page.goto('/personas/no-existe');
    await expect(page.getByText('Esta persona no existe.')).toBeVisible();
    await page.waitForTimeout(1_500);

    expect(pedidos).toBe(1);
  });

  test('si la borran mientras la miras, deja de mostrarla', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Copia Vieja');
    await page.clock.install();

    await page.goto(`/personas/${id}`);
    await expect(page.getByRole('heading', { name: 'Copia Vieja', level: 1 })).toBeVisible();

    await request.delete(`/api/usuarios/${id}`);
    await page.clock.fastForward(11_000);
    // Lo que hace el navegador al volver a la pestaña: React Query revisa lo que ya venció.
    await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')));

    await expect(page.getByText('Esta persona no existe.')).toBeVisible();
  });

  test('una ruta que no existe también', async ({ page }) => {
    await page.goto('/nada/por/aqui');

    await expect(page.getByText('Esta página no existe.')).toBeVisible();
  });
});

test.describe('Actuar como', () => {
  test('la persona elegida sobrevive a recargar, y Salir la suelta', async ({ page }) => {
    await page.goto('/personas');
    await actuarComo(page, 'mejia', 'Carlos Mejía');
    await expect(page.getByText('Actuando como')).toBeVisible();

    await page.reload();

    await expect(enCabecera(page, 'Carlos Mejía')).toBeVisible();

    await page.getByRole('button', { name: 'Salir' }).click();

    await expect(selectorDeUsuario(page)).toBeVisible();
    await page.reload();
    await expect(selectorDeUsuario(page)).toBeVisible();
  });

  test('Cambiar reemplaza a la persona, y Escape la conserva', async ({ page }) => {
    await page.goto('/personas');
    await actuarComo(page, 'mejia', 'Carlos Mejía');

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await selectorDeUsuario(page).press('Escape');
    await expect(enCabecera(page, 'Carlos Mejía')).toBeVisible();

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await actuarComo(page, 'andrea', 'Andrea Pérez');
    await expect(enCabecera(page, 'Andrea Pérez')).toBeVisible();
  });

  test('hacer clic afuera deja de cambiar', async ({ page }) => {
    await page.goto('/personas');
    await actuarComo(page, 'mejia', 'Carlos Mejía');

    await page.getByRole('button', { name: 'Cambiar' }).click();
    await expect(selectorDeUsuario(page)).toBeFocused();
    await page.getByRole('heading', { name: 'Personas', level: 1 }).click();

    await expect(enCabecera(page, 'Carlos Mejía')).toBeVisible();
  });

  test('desde el perfil, y el botón desaparece', async ({ page }) => {
    await page.goto('/personas/usr-01');

    await page.getByRole('button', { name: 'Actuar como esta persona' }).click();

    await expect(enCabecera(page, 'Andrea Pérez')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actuar como esta persona' })).toBeHidden();
  });

  test('funciona solo con teclado', async ({ page }) => {
    await page.goto('/personas');
    await selectorDeUsuario(page).fill('mejia');
    await expect(page.getByRole('option', { name: /Carlos Mejía/ })).toBeVisible();

    await selectorDeUsuario(page).press('Enter');

    await expect(enCabecera(page, 'Carlos Mejía')).toBeVisible();
  });

  test('Enter no elige de una lista que ya quedó vieja', async ({ page }) => {
    await page.goto('/personas');
    await selectorDeUsuario(page).click();
    await expect(page.getByRole('option').first()).toBeVisible();

    // La búsqueda nueva tarda: mientras tanto, en pantalla sigue la lista sin filtrar.
    await page.route('**/api/usuarios?*busqueda=*', async (ruta) => {
      await new Promise((r) => setTimeout(r, 1_000));
      await ruta.continue();
    });
    await selectorDeUsuario(page).fill('mejia');
    await page.waitForTimeout(400);
    await selectorDeUsuario(page).press('Enter');

    await expect(selectorDeUsuario(page)).toHaveValue('mejia');
    await expect(page.getByText('Actuando como')).toBeHidden();
  });

  test('si borran a quien representas, el selector la suelta', async ({ page, request }) => {
    const { id } = await crearPorApi(request, 'Me Borran');

    await page.goto(`/personas/${id}`);
    await page.getByRole('button', { name: 'Actuar como esta persona' }).click();
    await expect(enCabecera(page, 'Me Borran')).toBeVisible();

    await page.getByRole('button', { name: 'Eliminar' }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();

    await expect(selectorDeUsuario(page)).toBeVisible();
    expect(await page.evaluate((clave) => localStorage.getItem(clave), CLAVE_ACTUAL)).toBeNull();
  });

  test('un id guardado de alguien que ya no existe se suelta solo', async ({ page }) => {
    await page.addInitScript((clave) => {
      if (!sessionStorage.getItem('preparado')) {
        sessionStorage.setItem('preparado', '1');
        localStorage.setItem(clave, 'ya-no-existe');
      }
    }, CLAVE_ACTUAL);

    await page.goto('/personas');

    await expect(selectorDeUsuario(page)).toBeVisible();
    expect(await page.evaluate((clave) => localStorage.getItem(clave), CLAVE_ACTUAL)).toBeNull();
  });
});

test.describe('Fallos del servidor', () => {
  test('con el backend apagado avisa, y Reintentar recupera', async ({ page }) => {
    // El proxy de Vite responde 500 sin JSON cuando no alcanza el backend.
    await page.route(API, (ruta) => ruta.fulfill({ status: 500, body: '' }));

    await page.goto('/personas');

    await expect(page.getByRole('alert')).toContainText(SIN_CONEXION, { timeout: 10_000 });

    await page.unroute(API);
    await page.getByRole('button', { name: 'Reintentar' }).click();

    await expect(page.getByRole('link', { name: /Alejandro Suárez/ })).toBeVisible();
    await expect(page.getByRole('alert')).toBeHidden();
  });

  test('sin red también avisa', async ({ page }) => {
    await page.route(API, (ruta) => ruta.abort());

    await page.goto('/personas');

    await expect(page.getByRole('alert')).toContainText(SIN_CONEXION, { timeout: 10_000 });
  });

  test('con Neo4j caído dice por qué, y no repite lo que el backend ya reintentó', async ({ page }) => {
    let pedidos = 0;
    await page.route(API, (ruta) => {
      pedidos++;
      return ruta.fulfill({
        status: 503,
        json: { codigo: 'BASE_NO_DISPONIBLE', mensaje: 'La base de datos no está disponible' },
      });
    });

    await page.goto('/personas');

    await expect(page.getByRole('alert')).toContainText('La base de datos no está disponible');
    await page.waitForTimeout(1_500);
    expect(pedidos).toBe(1);
  });

  test('una caída no suelta a la persona elegida', async ({ page }) => {
    await page.goto('/personas');
    await actuarComo(page, 'mejia', 'Carlos Mejía');
    await expect(enCabecera(page, 'Carlos Mejía')).toBeVisible();

    await page.route(API, (ruta) => ruta.fulfill({ status: 500, body: '' }));
    await page.reload();

    // Espera a que se agoten los reintentos: antes de eso todavía no hay error que la suelte.
    await expect(page.getByText('Persona no disponible')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('alert')).toContainText(SIN_CONEXION, { timeout: 10_000 });

    await page.unroute(API);
    await page.reload();

    await expect(enCabecera(page, 'Carlos Mejía')).toBeVisible();
  });

  test('un fallo al guardar conserva lo escrito', async ({ page }) => {
    await page.goto('/personas/nueva');
    await page.getByLabel('Nombre').fill('No Me Pierdas');
    await page.getByLabel('Email').fill(emailDePrueba());
    await page.getByLabel('Ciudad').selectOption({ label: 'Cali' });

    await page.route('**/api/usuarios', (ruta) => ruta.fulfill({ status: 500, body: '' }));
    await page.getByRole('button', { name: 'Crear persona' }).click();

    await expect(page.getByRole('alert')).toContainText(SIN_CONEXION);
    await expect(page.getByLabel('Nombre')).toHaveValue('No Me Pierdas');
    await expect(page.getByRole('button', { name: 'Crear persona' })).toBeEnabled();
  });
});
