import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver, leer } from '../src/neo4j.js';

afterAll(cerrarDriver);

// Mismos datos, misma respuesta. Sin un ORDER BY, collect() y COLLECT { } devuelven el orden en que
// Neo4j guardó los datos, y ese orden cambia al recargar la semilla: "AWS, SQL y Python" pasaba a
// "Python, AWS y SQL" y las pruebas de la interfaz que lo leían fallaban. Aquí se exige el orden
// para todas las personas, ofertas y proyectos de la semilla, no solo para un ejemplo.

/** Orden por código de carácter, el mismo que usa Cypher para comparar textos. */
const ordenada = (lista: string[]) => [...lista].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

type Fila = Record<string, unknown>;

async function datos(ruta: string): Promise<Fila[]> {
  const respuesta = await request(app).get(ruta);
  expect(respuesta.status, ruta).toBe(200);
  return respuesta.body.datos as Fila[];
}

/** Cada campo pedido de cada fila es una lista de textos en orden. */
function revisarListas(ruta: string, filas: Fila[], campos: string[]) {
  for (const fila of filas) {
    for (const campo of campos) {
      const lista = fila[campo] as string[];
      expect(Array.isArray(lista), `${ruta} ${campo}`).toBe(true);
      expect(lista, `${ruta} → ${JSON.stringify(fila).slice(0, 80)} → ${campo}`).toEqual(ordenada(lista));
    }
  }
}

const usuarios = Array.from({ length: 40 }, (_, i) => `usr-${String(i + 1).padStart(2, '0')}`);
const proyectos = Array.from({ length: 12 }, (_, i) => `prj-${String(i + 1).padStart(2, '0')}`);

describe('listas en orden, para toda la semilla', () => {
  it('habilidades compartidas de los usuarios similares', async () => {
    for (const id of usuarios) {
      const ruta = `/usuarios/${id}/similares`;
      revisarListas(ruta, await datos(ruta), ['compartidas']);
    }
  });

  it('el porqué de los contactos sugeridos', async () => {
    for (const id of usuarios) {
      const ruta = `/usuarios/${id}/recomendaciones/contactos`;
      revisarListas(ruta, await datos(ruta), ['contactosEnComun', 'empresasEnComun', 'habilidadesEnComun']);
    }
  });

  it('el porqué de los empleos sugeridos', async () => {
    for (const id of usuarios) {
      const ruta = `/usuarios/${id}/recomendaciones/empleos`;
      revisarListas(ruta, await datos(ruta), ['cumple', 'faltan', 'faltanObligatorias', 'contactosEnEmpresa']);
    }
  });

  it('el porqué de los candidatos de cada oferta abierta', async () => {
    const ofertas = (await request(app).get('/ofertas?estado=abierta&limite=100')).body.datos as { id: string }[];
    expect(ofertas.length).toBeGreaterThan(0);
    for (const { id } of ofertas) {
      const ruta = `/ofertas/${id}/candidatos`;
      revisarListas(ruta, await datos(ruta), ['cumple', 'faltan', 'faltanObligatorias', 'contactosEnEmpresa']);
    }
  });

  it('el porqué de los colaboradores de cada proyecto', async () => {
    for (const id of proyectos) {
      const ruta = `/proyectos/${id}/colaboradores`;
      revisarListas(ruta, await datos(ruta), ['habilidadesUtiles', 'contactosEnProyecto']);
    }
  });

  it('tecnologías y miembros de los proyectos relacionados', async () => {
    const ruta = '/proyectos/relacionados';
    revisarListas(ruta, await datos(ruta), ['tecnologias', 'miembrosEnComun', 'miembrosConectados']);
  });

  it('integrantes de cada comunidad, con ids en el mismo orden que los nombres', async () => {
    const ruta = '/analitica/comunidades';
    const comunidades = await datos(ruta);
    revisarListas(ruta, comunidades, ['miembros']);
    const nombres = new Map(
      (await leer('MATCH (u:Usuario) RETURN u.id AS id, u.nombre AS nombre')).map((f) => [f.id as string, f.nombre]),
    );
    for (const comunidad of comunidades) {
      expect((comunidad.ids as string[]).map((id) => nombres.get(id))).toEqual(comunidad.miembros);
    }
  });
});

describe('grafo para dibujar', () => {
  // El dibujo parte de posiciones iniciales en el orden de los nodos: otro orden, otro dibujo.
  it('nodos por id y aristas por origen, destino y tipo', async () => {
    const respuesta = await request(app).get('/analitica/grafo');
    expect(respuesta.status).toBe(200);
    const ids = (respuesta.body.nodos as { id: string }[]).map((n) => n.id);
    expect(ids).toEqual(ordenada(ids));
    const aristas = (respuesta.body.aristas as { origen: string; destino: string; tipo: string }[]).map(
      (a) => `${a.origen} ${a.destino} ${a.tipo}`,
    );
    expect(aristas).toEqual(ordenada(aristas));
  });
});

describe('caminos con empate', () => {
  // Muchos pares tienen varios caminos igual de cortos (usr-07 llega a Salud Conectada por 11).
  // shortestPath devolvía cualquiera; la consulta elige el primero por ids. Aquí se calcula aparte,
  // con todos los caminos mínimos de cada par, y se compara par por par: con uno solo, shortestPath
  // podía acertar por casualidad.
  async function primerosPorIds(destino: 'Empresa' | 'Oferta', relaciones: string, usuarios: string[]) {
    const filas = await leer(
      `MATCH (u:Usuario), (d:${destino}) WHERE u.id IN $usuarios
       MATCH ruta = allShortestPaths((u)-[:${relaciones}*..8]-(d))
       WITH u.id AS usuario, d.id AS destino, [n IN nodes(ruta) | n.id] AS ids
       ORDER BY ids
       RETURN usuario, destino, collect(ids)[0] AS primero, count(*) AS caminos`,
      { usuarios },
    );
    return filas.map((f) => ({
      usuario: f.usuario as string,
      destino: f.destino as string,
      primero: f.primero as string[],
      caminos: Number(f.caminos),
    }));
  }

  async function revisar(ruta: (usuario: string, destino: string) => string, esperados: Awaited<ReturnType<typeof primerosPorIds>>) {
    expect(esperados.filter((e) => e.caminos > 1).length).toBeGreaterThan(5);
    for (const { usuario, destino, primero } of esperados) {
      const respuesta = await request(app).get(ruta(usuario, destino));
      expect(respuesta.status).toBe(200);
      const ids = (respuesta.body.ruta.nodos as { id: string }[]).map((n) => n.id);
      expect(ids, `${usuario} → ${destino}`).toEqual(primero);
    }
  }

  it('de cada persona a cada empresa, siempre el primero por ids', async () => {
    const esperados = await primerosPorIds('Empresa', 'CONECTA_CON|TRABAJA_EN', usuarios);
    await revisar((u, d) => `/usuarios/${u}/ruta-empresa/${d}`, esperados);
  });

  it('de una muestra de personas a cada oferta, siempre el primero por ids', async () => {
    const esperados = await primerosPorIds('Oferta', 'CONECTA_CON|TRABAJA_EN|PUBLICA', usuarios.slice(0, 12));
    await revisar((u, d) => `/usuarios/${u}/ruta-oferta/${d}`, esperados);
  });
});
