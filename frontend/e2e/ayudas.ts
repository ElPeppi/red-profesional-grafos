import { expect, type APIRequestContext, type Page } from '@playwright/test';

// Con la ruta completa: '**/api/**' también atraparía el código de la app en /src/api/.
export const API = 'http://localhost:5173/api/**';

let contador = 0;
export const emailDePrueba = () => `e2e.${Date.now()}.${contador++}@prueba.test`;

export async function crearPorApi(request: APIRequestContext, nombre: string) {
  const respuesta = await request.post('/api/usuarios', {
    data: { nombre, email: emailDePrueba(), titular: 'Persona de prueba', ciudadId: 'monteria' },
  });
  expect(respuesta.status()).toBe(201);
  return (await respuesta.json()) as { id: string; email: string };
}

export async function solicitarPorApi(request: APIRequestContext, a: string, b: string) {
  expect((await request.post(`/api/usuarios/${a}/solicitudes`, { data: { destinoId: b } })).status()).toBe(201);
}

export async function conectarPorApi(request: APIRequestContext, a: string, b: string) {
  await solicitarPorApi(request, a, b);
  const aceptada = await request.post('/api/solicitudes/aceptar', { data: { solicitanteId: a, destinoId: b } });
  expect(aceptada.status()).toBe(200);
}

export async function habilidadPorApi(request: APIRequestContext, usuario: string, habilidad: string, nivel: number) {
  const respuesta = await request.put(`/api/usuarios/${usuario}/habilidades/${habilidad}`, { data: { nivel } });
  expect(respuesta.status()).toBe(200);
}

/** Elige la persona de "Actuar como" sin pasar por el selector, que ya tiene sus propias pruebas. */
export async function representarA(page: Page, id: string) {
  await page.goto('/personas');
  await page.evaluate((valor) => localStorage.setItem('red-profesional:usuario-actual', valor), id);
}

const lienzo = (page: Page) => page.locator('[data-listo="true"] canvas').first();

/** Espera a que la simulación termine y a que acabe la animación que ajusta la vista. */
export async function esperarGrafo(page: Page) {
  await expect(lienzo(page)).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(800);
}

/** El dibujo es un canvas sin DOM: lo único comprobable desde afuera son sus píxeles. */
function buscarColor(canvas: HTMLCanvasElement, hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const contexto = canvas.getContext('2d');
  if (!contexto) throw new Error('El canvas no tiene contexto 2d');

  const { data, width, height } = contexto.getImageData(0, 0, canvas.width, canvas.height);
  const es = (x: number, y: number) => {
    const i = (y * width + x) * 4;
    return data[i] === r && data[i + 1] === g && data[i + 2] === b;
  };

  let total = 0;
  let punto: { x: number; y: number } | null = null;
  for (let y = 3; y < height - 3; y++) {
    for (let x = 3; x < width - 3; x++) {
      if (!es(x, y)) continue;
      total++;
      // Con sus vecinos del mismo color: es el interior de un nodo, no un borde.
      if (!punto && es(x - 3, y) && es(x + 3, y) && es(x, y - 3) && es(x, y + 3)) punto = { x, y };
    }
  }

  const escala = canvas.width / canvas.clientWidth;
  return { total, punto: punto && { x: punto.x / escala, y: punto.y / escala } };
}

export const pixelesDeColor = async (page: Page, hex: string) =>
  (await lienzo(page).evaluate(buscarColor, hex)).total;

/** Hace clic en un nodo de ese color, como lo haría una persona. */
export async function clicEnNodo(page: Page, hex: string) {
  const { punto } = await lienzo(page).evaluate(buscarColor, hex);
  const caja = await lienzo(page).boundingBox();
  if (!punto || !caja) throw new Error(`No hay ningún nodo de color ${hex}`);

  await page.mouse.move(caja.x + punto.x, caja.y + punto.y);
  // La librería detecta qué hay bajo el puntero en su siguiente cuadro.
  await page.waitForTimeout(200);
  await page.mouse.down();
  await page.mouse.up();
}
