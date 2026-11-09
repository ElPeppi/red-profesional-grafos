import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { consulta } from '../src/consultas.js';
import { cerrarDriver, escribir, leer } from '../src/neo4j.js';
import { enCola } from '../src/repositorios/analitica.js';
import {
  abrirConexiones,
  conMarca,
  conectar,
  crearEmpresa,
  crearOferta,
  crearUsuario,
  limpiarDatosDePrueba,
  pedirHabilidad,
  ponerEmpleo,
} from './ayudas.js';

interface Comunidad {
  integrantes: number;
  ids: string[];
  miembros: string[];
  ciudades: string[];
}

interface Nodo {
  id: string;
  nombre: string;
  tipo: string;
}

interface Arista {
  origen: string;
  destino: string;
  tipo: string;
}

const grafo = async (): Promise<{ nodos: Nodo[]; aristas: Arista[] }> =>
  (await request(app).get('/analitica/grafo').expect(200)).body;

const comunidades = async (): Promise<Comunidad[]> =>
  (await request(app).get('/analitica/comunidades').expect(200)).body.datos;

const demandaDe = async (habilidad: string) => {
  const res = await request(app).get('/analitica/habilidades').expect(200);
  return res.body.datos.find((h: { habilidad: string }) => h.habilidad === habilidad);
};

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('GET /analitica/influyentes', () => {
  it('pone primero a los usuarios puente', async () => {
    const res = await request(app).get('/analitica/influyentes').expect(200);

    expect(res.body.datos).toHaveLength(10);
    expect(res.body.datos.slice(0, 3).map((u: { id: string }) => u.id)).toEqual(['usr-02', 'usr-15', 'usr-21']);
    expect(res.body.datos[0]).toEqual({
      id: 'usr-02',
      usuario: 'Carlos Mejía',
      titular: 'Tech Lead Full Stack',
      influencia: expect.any(Number),
      conexiones: 8,
    });
  });

  it('ordena de mayor a menor influencia', async () => {
    const res = await request(app).get('/analitica/influyentes').expect(200);
    const valores = res.body.datos.map((u: { influencia: number }) => u.influencia);
    expect(valores).toEqual([...valores].sort((a, b) => b - a));
  });
});

describe('GET /analitica/grafo', () => {
  // Las comunidades cuentan a toda la red: lo creado aquí no debe llegar a sus pruebas.
  afterAll(limpiarDatosDePrueba);

  it('trae personas, empresas y ofertas, y nada más', async () => {
    const { nodos } = await grafo();
    const cuantos = (tipo: string) => nodos.filter((n) => n.tipo === tipo).length;

    expect(cuantos('Usuario')).toBe(40);
    expect(cuantos('Empresa')).toBe(8);
    expect(cuantos('Oferta')).toBe(15);
    expect(nodos).toHaveLength(63);
  });

  it('nombra a las ofertas por su título', async () => {
    const { nodos } = await grafo();

    expect(nodos).toContainEqual({ id: 'of-06', nombre: 'Ingeniero de Grafos Neo4j', tipo: 'Oferta' });
  });

  it('cada arista une nodos que están en la lista', async () => {
    const { nodos, aristas } = await grafo();
    const ids = new Set(nodos.map((n) => n.id));

    expect(aristas.length).toBeGreaterThan(0);
    for (const { origen, destino } of aristas) {
      expect(ids.has(origen)).toBe(true);
      expect(ids.has(destino)).toBe(true);
    }
  });

  it('solo trae las relaciones que recorren los caminos', async () => {
    const { aristas } = await grafo();

    expect(new Set(aristas.map((a) => a.tipo))).toEqual(new Set(['CONECTA_CON', 'TRABAJA_EN', 'PUBLICA']));
  });

  it('coincide con la base: ni falta ni sobra ninguna relación', async () => {
    const { aristas } = await grafo();
    const pares = aristas.map((a) => `${a.origen}|${a.destino}|${a.tipo}`);
    const [conteo] = await leer(`
      MATCH (a)-[r:CONECTA_CON|TRABAJA_EN|PUBLICA]->(b)
      WITH DISTINCT a, b, type(r) AS tipo
      RETURN count(*) AS total`);

    expect(new Set(pares).size).toBe(pares.length);
    expect(pares).toHaveLength(conteo?.total as number);
  });

  it('dos empleos en la misma empresa son una sola arista', async () => {
    const [usuario, empresa] = [await crearUsuario(), await crearEmpresa()];
    await ponerEmpleo(usuario, empresa);
    await escribir('MATCH (u:Usuario {id: $usuario}), (e:Empresa {id: $empresa}) CREATE (u)-[:TRABAJA_EN]->(e)', {
      usuario,
      empresa,
    });

    const { aristas } = await grafo();

    expect(aristas.filter((a) => a.origen === usuario && a.destino === empresa)).toHaveLength(1);
  });

  it('muestra al momento lo que crea la API, sin juntar homónimos', async () => {
    const nombre = conMarca('Homónimo');
    const [a, b] = [await crearUsuario({ nombre }), await crearUsuario({ nombre })];
    await conectar(a, b);

    const { nodos, aristas } = await grafo();

    expect(nodos.filter((n) => n.nombre === nombre).map((n) => n.id).sort()).toEqual([a, b].sort());
    expect(aristas.filter((x) => [a, b].includes(x.origen) && [a, b].includes(x.destino))).toHaveLength(1);
  });
});

describe('GET /analitica/comunidades', () => {
  it('cada id corresponde al nombre en la misma posición', async () => {
    const { nodos } = await grafo();
    const nombreDe = new Map(nodos.map((n) => [n.id, n.nombre]));

    for (const comunidad of await comunidades()) {
      expect(comunidad.ids.map((id) => nombreDe.get(id))).toEqual(comunidad.miembros);
    }
  });

  it('lista a los integrantes por nombre', async () => {
    for (const comunidad of await comunidades()) {
      expect(comunidad.miembros).toEqual([...comunidad.miembros].sort());
    }
  });

  it('un empate de tamaño se decide por el primer integrante, no por el número de comunidad', async () => {
    const datos = await comunidades();
    const iguales = datos.slice(1).filter((c, i) => c.integrantes === datos[i]?.integrantes);

    expect(iguales.length).toBeGreaterThan(0);
    datos.slice(1).forEach((actual, i) => {
      const anterior = datos[i];
      if (actual.integrantes === anterior?.integrantes) {
        expect(`${anterior.ids[0]}`.localeCompare(`${actual.ids[0]}`)).toBeLessThan(0);
      }
    });
  });

  it('da el mismo orden en cada llamada: los colores del panel dependen de eso', async () => {
    const orden = (datos: Comunidad[]) => datos.map((c) => c.ids.join());

    const primera = orden(await comunidades());

    expect(orden(await comunidades())).toEqual(primera);
    expect(orden(await comunidades())).toEqual(primera);
  });

  it('agrupa a los 38 usuarios con conexiones, sin comunidades de una persona', async () => {
    const datos = await comunidades();

    expect(datos.length).toBeGreaterThanOrEqual(4);
    expect(datos.reduce((total, c) => total + c.integrantes, 0)).toBe(38);
    for (const comunidad of datos) expect(comunidad.integrantes).toBeGreaterThan(1);
  });

  it('ordena de mayor a menor y muestra miembros y ciudades', async () => {
    const datos = await comunidades();
    const tamanos = datos.map((c) => c.integrantes);

    expect(tamanos).toEqual([...tamanos].sort((a, b) => b - a));
    expect(datos[0]?.miembros).toHaveLength(datos[0]?.integrantes ?? 0);
    expect(datos[0]?.ciudades.length).toBeGreaterThan(0);
  });
});

describe('La analítica ve la red actual', () => {
  it('una conexión nueva aparece, y al borrar a los usuarios desaparece', async () => {
    await comunidades();
    const [nombreA, nombreB] = [`Pareja ${randomUUID()}`, `Pareja ${randomUUID()}`];
    const [a, b] = [await crearUsuario({ nombre: nombreA }), await crearUsuario({ nombre: nombreB })];
    await conectar(a, b);

    const conPareja = await comunidades();
    const pareja = conPareja.find((c) => c.miembros.includes(nombreA));
    expect(pareja?.miembros.sort()).toEqual([nombreA, nombreB].sort());

    await request(app).delete(`/usuarios/${a}`).expect(204);
    await request(app).delete(`/usuarios/${b}`).expect(204);

    const sinPareja = await comunidades();
    expect(sinPareja.flatMap((c) => c.miembros)).not.toContain(nombreA);
  });

  it('funciona aunque la proyección se haya perdido, como al reiniciar Neo4j', async () => {
    await leer(consulta('borrarProyeccion'));
    await request(app).get('/analitica/influyentes').expect(200);
  });
});

describe('Varias peticiones de analítica a la vez', () => {
  // Ocho y no más: van en fila, y cada Louvain tarda unos 650 ms.
  it('ocho llamadas simultáneas responden bien', async () => {
    await abrirConexiones();
    const rutas = Array.from({ length: 8 }, (_, i) => (i % 2 === 0 ? 'influyentes' : 'comunidades'));

    const respuestas = await Promise.all(rutas.map((r) => request(app).get(`/analitica/${r}`)));

    expect(respuestas.map((r) => r.status)).toEqual(rutas.map(() => 200));
  });
});

describe('enCola', () => {
  const pausa = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

  it('atiende los trabajos en orden, sin solaparlos', async () => {
    const eventos: string[] = [];
    const trabajo = (nombre: string, ms: number) => async () => {
      eventos.push(`empieza ${nombre}`);
      await pausa(ms);
      eventos.push(`termina ${nombre}`);
    };

    await Promise.all([enCola(trabajo('lento', 30)), enCola(trabajo('rápido', 1))]);

    expect(eventos).toEqual(['empieza lento', 'termina lento', 'empieza rápido', 'termina rápido']);
  });

  it('un fallo llega a quien lo pidió y no frena a los siguientes', async () => {
    await expect(enCola(() => Promise.reject(new Error('falló')))).rejects.toThrow('falló');
    await expect(enCola(async () => 'sigue')).resolves.toBe('sigue');
  });
});

describe('GET /analitica/habilidades', () => {
  it('ordena por demanda y compara con los profesionales disponibles', async () => {
    const res = await request(app).get('/analitica/habilidades').expect(200);

    expect(res.body.datos).toHaveLength(10);
    expect(res.body.datos[0]).toEqual({
      habilidad: 'SQL',
      categoria: 'Datos',
      ofertas: 6,
      obligatoria: 4,
      nivelMinimoPromedio: 2.7,
      profesionales: 18,
    });
  });

  it('cuenta solo ofertas abiertas', async () => {
    const oferta = await crearOferta();
    await pedirHabilidad(oferta, 'sql');
    expect((await demandaDe('SQL')).ofertas).toBe(7);

    await request(app).patch(`/ofertas/${oferta}`).send({ estado: 'cerrada' }).expect(200);

    expect((await demandaDe('SQL')).ofertas).toBe(6);
  });
});
