import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver, leer } from '../src/neo4j.js';
import {
  conMarca,
  conectar,
  crearEmpresa,
  crearOferta,
  crearProyecto,
  crearUsuario,
  limpiarDatosDePrueba,
  ofertaDePrueba,
  pedirHabilidad,
  ponerEmpleo,
  ponerHabilidad,
} from './ayudas.js';

interface Candidato {
  id: string;
  puntaje: number;
  faltanObligatorias: string[];
}

const obtener = (ruta: string) => request(app).get(ruta);
const ids = (filas: { id: string }[]) => filas.map((f) => f.id);

const nuevaOferta = async (empresaId: string, extra: Record<string, unknown> = {}): Promise<string> => {
  const res = await request(app).post('/ofertas').send(ofertaDePrueba(empresaId, extra)).expect(201);
  return res.body.id;
};

const candidatoEn = async (oferta: string, usuario: string) => {
  const res = await obtener(`/ofertas/${oferta}/candidatos`).expect(200);
  return res.body.datos.find((c: Candidato) => c.id === usuario);
};

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('GET /usuarios/:id/similares', () => {
  it('calcula Jaccard: compartidas entre el total de habilidades distintas', async () => {
    const [a, b] = [await crearUsuario(), await crearUsuario()];
    await ponerHabilidad(a, 'ux-research');
    await ponerHabilidad(a, 'angular');
    await ponerHabilidad(b, 'ux-research');
    await ponerHabilidad(b, 'kotlin');

    const res = await obtener(`/usuarios/${a}/similares`).expect(200);

    const fila = res.body.datos.find((u: { id: string }) => u.id === b);
    expect(fila).toMatchObject({ compartidas: ['UX Research'], jaccard: 0.33 });
  });

  it('ordena de más a menos parecido y no se incluye a sí mismo', async () => {
    const res = await obtener('/usuarios/usr-16/similares').expect(200);
    const valores = res.body.datos.map((u: { jaccard: number }) => u.jaccard);

    expect(valores.length).toBeGreaterThan(1);
    expect(valores).toEqual([...valores].sort((x, y) => y - x));
    expect(ids(res.body.datos)).not.toContain('usr-16');
  });

  it('sin habilidades da lista vacía, no error', async () => {
    const res = await obtener(`/usuarios/${await crearUsuario()}/similares`).expect(200);
    expect(res.body).toEqual({ datos: [] });
  });

  it('responde 404 si el usuario no existe', async () => {
    const res = await obtener('/usuarios/no-existe/similares').expect(404);
    expect(res.body.codigo).toBe('USUARIO_NO_ENCONTRADO');
  });
});

describe('GET /usuarios/:id/contactos-comunes/:otroId', () => {
  it('encuentra los contactos en común de la semilla, ordenados por nombre', async () => {
    const res = await obtener('/usuarios/usr-15/contactos-comunes/usr-20').expect(200);
    expect(ids(res.body.datos)).toEqual(['usr-16', 'usr-12', 'usr-17', 'usr-14']);
  });

  it('da lo mismo en ambos sentidos', async () => {
    const [ida, vuelta] = await Promise.all([
      obtener('/usuarios/usr-15/contactos-comunes/usr-20').expect(200),
      obtener('/usuarios/usr-20/contactos-comunes/usr-15').expect(200),
    ]);
    expect(vuelta.body).toEqual(ida.body);
  });

  it('sin contactos en común da lista vacía', async () => {
    const res = await obtener('/usuarios/usr-39/contactos-comunes/usr-40').expect(200);
    expect(res.body).toEqual({ datos: [] });
  });

  it('consigo mismo da lista vacía', async () => {
    const res = await obtener('/usuarios/usr-15/contactos-comunes/usr-15').expect(200);
    expect(res.body).toEqual({ datos: [] });
  });

  it('responde 404 si falta alguno de los dos', async () => {
    await obtener('/usuarios/no-existe/contactos-comunes/usr-20').expect(404);
    await obtener('/usuarios/usr-15/contactos-comunes/no-existe').expect(404);
  });
});

describe('GET /usuarios/:id/ruta-empresa/:empresaId', () => {
  it('devuelve el camino más corto con sus relaciones', async () => {
    const { body } = await obtener('/usuarios/usr-38/ruta-empresa/emp-06').expect(200);

    expect(body.ruta.saltos).toBe(3);
    expect(body.ruta.camino).toHaveLength(4);
    expect(body.ruta.camino[0]).toBe('Kevin Petro');
    expect(body.ruta.camino.at(-1)).toBe('Estudio Pixel');
    expect(body.ruta.nodos.map((n: { nombre: string }) => n.nombre)).toEqual(body.ruta.camino);
    expect(body.ruta.nodos[0]).toEqual({ id: 'usr-38', nombre: 'Kevin Petro', tipo: 'Usuario' });
    expect(body.ruta.nodos.at(-1)).toEqual({ id: 'emp-06', nombre: 'Estudio Pixel', tipo: 'Empresa' });
    expect(body.ruta.relaciones.at(-1)).toBe('TRABAJA_EN');
  });

  it('quien trabaja ahí está a un salto', async () => {
    const { body } = await obtener('/usuarios/usr-01/ruta-empresa/emp-01').expect(200);
    expect(body.ruta).toEqual({
      saltos: 1,
      camino: ['Andrea Pérez', 'Caribe Software'],
      relaciones: ['TRABAJA_EN'],
      nodos: [
        { id: 'usr-01', nombre: 'Andrea Pérez', tipo: 'Usuario' },
        { id: 'emp-01', nombre: 'Caribe Software', tipo: 'Empresa' },
      ],
    });
  });

  it('un empleo anterior también sirve de camino', async () => {
    const [usuario, empresa] = [await crearUsuario(), await crearEmpresa()];
    await ponerEmpleo(usuario, empresa, false);

    const { body } = await obtener(`/usuarios/${usuario}/ruta-empresa/${empresa}`).expect(200);
    expect(body.ruta.saltos).toBe(1);
  });

  it('sin camino responde 200 con ruta nula', async () => {
    const res = await obtener('/usuarios/usr-39/ruta-empresa/emp-06').expect(200);
    expect(res.body).toEqual({ ruta: null });
  });

  it('responde 404 si falta el usuario o la empresa', async () => {
    await obtener('/usuarios/no-existe/ruta-empresa/emp-06').expect(404);
    const res = await obtener('/usuarios/usr-38/ruta-empresa/no-existe').expect(404);
    expect(res.body.codigo).toBe('EMPRESA_NO_ENCONTRADA');
  });
});

describe('GET /usuarios/:id/ruta-oferta/:ofertaId', () => {
  it('llega a la oferta a través de la empresa que la publica', async () => {
    const { body } = await obtener('/usuarios/usr-38/ruta-oferta/of-06').expect(200);

    expect(body.ruta.saltos).toBe(4);
    expect(body.ruta.camino.at(-1)).toBe('Ingeniero de Grafos Neo4j');
    expect(body.ruta.nodos.map((n: { nombre: string }) => n.nombre)).toEqual(body.ruta.camino);
    expect(body.ruta.nodos.at(-1)).toEqual({ id: 'of-06', nombre: 'Ingeniero de Grafos Neo4j', tipo: 'Oferta' });
    expect(body.ruta.nodos.at(-2).tipo).toBe('Empresa');
    expect(body.ruta.relaciones.slice(-2)).toEqual(['TRABAJA_EN', 'PUBLICA']);
  });

  it('sin camino responde 200 con ruta nula', async () => {
    const res = await obtener('/usuarios/usr-39/ruta-oferta/of-06').expect(200);
    expect(res.body).toEqual({ ruta: null });
  });

  it('responde 404 si falta el usuario o la oferta', async () => {
    await obtener('/usuarios/no-existe/ruta-oferta/of-06').expect(404);
    const res = await obtener('/usuarios/usr-38/ruta-oferta/no-existe').expect(404);
    expect(res.body.codigo).toBe('OFERTA_NO_ENCONTRADA');
  });
});

describe('GET /usuarios/:id/recomendaciones/contactos', () => {
  it('cierre triádico: sugiere al contacto de un contacto, con su razón y puntaje', async () => {
    const [a, b, c] = [
      await crearUsuario({ ciudadId: 'monteria' }),
      await crearUsuario({ ciudadId: 'cali', nombre: 'Contacto Puente' }),
      await crearUsuario({ ciudadId: 'monteria' }),
    ];
    await conectar(a, b);
    await conectar(b, c);

    const res = await obtener(`/usuarios/${a}/recomendaciones/contactos`).expect(200);

    // 3 por el contacto en común + 1 por la misma ciudad.
    const fila = res.body.datos.find((u: { id: string }) => u.id === c);
    expect(fila).toMatchObject({ puntaje: 4, contactosEnComun: ['Contacto Puente'], mismaCiudad: true });
  });

  it('dos empresas homónimas cuentan por separado', async () => {
    const [a, b] = [await crearUsuario({ ciudadId: 'monteria' }), await crearUsuario({ ciudadId: 'cali' })];
    for (let i = 0; i < 2; i++) {
      const empresa = await crearEmpresa({ nombre: conMarca('Homónima') });
      await ponerEmpleo(a, empresa);
      await ponerEmpleo(b, empresa);
    }

    const res = await obtener(`/usuarios/${a}/recomendaciones/contactos`).expect(200);

    const fila = res.body.datos.find((u: { id: string }) => u.id === b);
    expect(fila).toMatchObject({ puntaje: 4, empresasEnComun: [conMarca('Homónima'), conMarca('Homónima')] });
  });

  it('funciona para quien no tiene conexiones (arranque en frío)', async () => {
    const res = await obtener('/usuarios/usr-39/recomendaciones/contactos').expect(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
  });

  it('no sugiere a quien ya es contacto', async () => {
    const res = await obtener('/usuarios/usr-01/recomendaciones/contactos').expect(200);
    const sugeridos = ids(res.body.datos);

    expect(sugeridos.length).toBeGreaterThan(0);
    for (const contacto of ['usr-02', 'usr-03', 'usr-04', 'usr-09']) expect(sugeridos).not.toContain(contacto);
  });

  it('deja de sugerir a quien ya tiene una solicitud pendiente', async () => {
    const [a, b] = [await crearUsuario({ ciudadId: 'monteria' }), await crearUsuario({ ciudadId: 'monteria' })];
    await ponerHabilidad(a, 'ux-research');
    await ponerHabilidad(b, 'ux-research');
    expect(ids((await obtener(`/usuarios/${a}/recomendaciones/contactos`).expect(200)).body.datos)).toContain(b);

    await request(app).post(`/usuarios/${a}/solicitudes`).send({ destinoId: b }).expect(201);

    expect(ids((await obtener(`/usuarios/${a}/recomendaciones/contactos`).expect(200)).body.datos)).not.toContain(b);
  });

  it('responde 404 si el usuario no existe', async () => {
    await obtener('/usuarios/no-existe/recomendaciones/contactos').expect(404);
  });
});

describe('GET /usuarios/:id/recomendaciones/empleos', () => {
  it('pone primero las ofertas que cumple y explica lo que falta', async () => {
    const res = await obtener('/usuarios/usr-39/recomendaciones/empleos').expect(200);

    expect(res.body.datos[0]).toMatchObject({
      id: 'of-10',
      puntaje: 40,
      cumple: ['Django', 'Python'],
      faltanObligatorias: [],
    });
    expect(res.body.datos[1].faltanObligatorias.length).toBeGreaterThan(0);
  });

  it('una oferta que cumple va antes que otra con más puntaje a la que le falta una obligatoria', async () => {
    const usuario = await crearUsuario({ ciudadId: 'monteria' });
    await ponerHabilidad(usuario, 'go');

    // 60 × 1/2 + 10 por ser remota = 40, pero falta Kotlin, que es obligatoria.
    const conFaltante = await crearOferta({ modalidad: 'remoto' });
    await pedirHabilidad(conFaltante, 'go', 3, false);
    await pedirHabilidad(conFaltante, 'kotlin', 3, true);

    // 60 × 1/3 = 20, presencial en otra ciudad, y lo que falta es opcional.
    const cumplida = await crearOferta({ modalidad: 'presencial', ciudadId: 'cali' });
    await pedirHabilidad(cumplida, 'go', 3, true);
    await pedirHabilidad(cumplida, 'kotlin', 3, false);
    await pedirHabilidad(cumplida, 'flutter', 3, false);

    const res = await obtener(`/usuarios/${usuario}/recomendaciones/empleos`).expect(200);

    const filas: Candidato[] = res.body.datos;
    const posicion = (id: string) => filas.findIndex((o) => o.id === id);
    expect(filas[posicion(conFaltante)]?.puntaje).toBe(40);
    expect(filas[posicion(cumplida)]?.puntaje).toBe(20);
    expect(posicion(cumplida)).toBeLessThan(posicion(conFaltante));
  });

  it('sin habilidades da lista vacía', async () => {
    const res = await obtener(`/usuarios/${await crearUsuario()}/recomendaciones/empleos`).expect(200);
    expect(res.body).toEqual({ datos: [] });
  });

  it('responde 404 si el usuario no existe', async () => {
    await obtener('/usuarios/no-existe/recomendaciones/empleos').expect(404);
  });
});

describe('GET /ofertas/:id/candidatos', () => {
  it('explica por qué recomienda a cada candidato', async () => {
    const res = await obtener('/ofertas/of-06/candidatos').expect(200);

    expect(res.body.datos[0]).toEqual({
      id: 'usr-16',
      candidato: 'Alejandro Suárez',
      puntaje: 80,
      cumple: expect.arrayContaining(['Neo4j', 'Python']),
      faltan: expect.any(Array),
      faltanObligatorias: [],
      contactosEnEmpresa: expect.any(Array),
      mismaCiudad: expect.any(Boolean),
    });
  });

  it('primero quien cumple las obligatorias; un puntaje alto no lo adelanta', async () => {
    const { body } = await obtener('/ofertas/of-06/candidatos').expect(200);
    const filas: Candidato[] = body.datos;

    filas.slice(1).forEach((fila, i) => {
      const anterior = filas[i]!;
      const faltaMas = fila.faltanObligatorias.length > anterior.faltanObligatorias.length;
      expect(faltaMas || fila.faltanObligatorias.length === anterior.faltanObligatorias.length).toBe(true);
      if (!faltaMas) expect(fila.puntaje).toBeLessThanOrEqual(anterior.puntaje);
    });
    const sinFaltantes = filas.filter((f) => f.faltanObligatorias.length === 0);
    const conFaltantes = filas.filter((f) => f.faltanObligatorias.length > 0);
    expect(sinFaltantes.length).toBeGreaterThan(0);
    expect(conFaltantes.length).toBeGreaterThan(0);
  });

  it('puntaje: 60% habilidades, 30% contactos y 10% ciudad', async () => {
    const empresa = await crearEmpresa();
    const oferta = await nuevaOferta(empresa, { ciudadId: 'cali', modalidad: 'presencial' });
    await pedirHabilidad(oferta, 'go');
    await pedirHabilidad(oferta, 'kotlin');
    const [candidato, contacto] = [await crearUsuario({ ciudadId: 'cali' }), await crearUsuario()];
    await ponerHabilidad(candidato, 'go');
    await ponerEmpleo(contacto, empresa);
    await conectar(candidato, contacto);

    const fila = await candidatoEn(oferta, candidato);

    // 60 × 1/2 + 30 × 1/3 + 10 = 50
    expect(fila).toMatchObject({ puntaje: 50, faltanObligatorias: ['Kotlin'], mismaCiudad: true });
    expect(fila.contactosEnEmpresa).toHaveLength(1);
  });

  // Los contactos se llaman igual a propósito: son personas distintas y cuentan aparte.
  it('los contactos topan en 3 y los homónimos cuentan por separado', async () => {
    const empresa = await crearEmpresa();
    const oferta = await nuevaOferta(empresa, { ciudadId: 'cali', modalidad: 'presencial' });
    await pedirHabilidad(oferta, 'go');
    const candidato = await crearUsuario({ ciudadId: 'cali' });
    await ponerHabilidad(candidato, 'go');
    for (let i = 0; i < 4; i++) {
      const contacto = await crearUsuario({ nombre: 'Homónimo' });
      await ponerEmpleo(contacto, empresa);
      await conectar(candidato, contacto);
    }

    const fila = await candidatoEn(oferta, candidato);
    expect(fila.contactosEnEmpresa).toHaveLength(4);
    expect(fila.puntaje).toBe(100);

    const empleos = await obtener(`/usuarios/${candidato}/recomendaciones/empleos`).expect(200);
    expect(empleos.body.datos.find((o: { id: string }) => o.id === oferta)).toMatchObject({
      puntaje: 100,
      contactosEnEmpresa: ['Homónimo', 'Homónimo', 'Homónimo', 'Homónimo'],
    });
  });

  it('en una oferta remota la ciudad no resta', async () => {
    const empresa = await crearEmpresa();
    const oferta = await nuevaOferta(empresa, { ciudadId: 'cali', modalidad: 'remoto' });
    await pedirHabilidad(oferta, 'go');
    const candidato = await crearUsuario({ ciudadId: 'monteria' });
    await ponerHabilidad(candidato, 'go');

    expect(await candidatoEn(oferta, candidato)).toMatchObject({ puntaje: 70, mismaCiudad: false });
  });

  it('no incluye a quien no está abierto a ofertas', async () => {
    const oferta = await crearOferta();
    await pedirHabilidad(oferta, 'go');
    const candidato = await crearUsuario({ abiertoAOfertas: false });
    await ponerHabilidad(candidato, 'go');

    expect(await candidatoEn(oferta, candidato)).toBeUndefined();
  });

  it('una oferta cerrada o sin requisitos da lista vacía', async () => {
    const cerrada = await obtener('/ofertas/of-08/candidatos').expect(200);
    expect(cerrada.body).toEqual({ datos: [] });

    const sinRequisitos = await obtener(`/ofertas/${await crearOferta()}/candidatos`).expect(200);
    expect(sinRequisitos.body).toEqual({ datos: [] });
  });

  it('responde 404 si la oferta no existe', async () => {
    const res = await obtener('/ofertas/no-existe/candidatos').expect(404);
    expect(res.body.codigo).toBe('OFERTA_NO_ENCONTRADA');
  });
});

describe('Candidatos y empleos usan las mismas reglas', () => {
  it('una oferta da al candidato el mismo puntaje que el candidato a la oferta', async () => {
    const { body } = await obtener('/ofertas/of-06/candidatos').expect(200);

    for (const candidato of body.datos.slice(0, 4) as Candidato[]) {
      const empleos = await obtener(`/usuarios/${candidato.id}/recomendaciones/empleos`).expect(200);
      const oferta = empleos.body.datos.find((o: { id: string }) => o.id === 'of-06');
      expect(oferta?.puntaje).toBe(candidato.puntaje);
    }
  });
});

describe('GET /proyectos/relacionados', () => {
  it('no se confunde con el id de un proyecto', async () => {
    const res = await obtener('/proyectos/relacionados').expect(200);
    expect(res.body.datos.length).toBeGreaterThan(0);
  });

  it('cada pareja sale una vez y tiene una razón', async () => {
    const { body } = await obtener('/proyectos/relacionados').expect(200);
    const filas: { proyecto1: string; proyecto2: string; tecnologias: string[] }[] = body.datos;

    const parejas = filas.map((f) => [f.proyecto1, f.proyecto2].sort().join(' + '));
    expect(new Set(parejas).size).toBe(filas.length);
    for (const fila of filas) expect(fila.proyecto1).not.toBe(fila.proyecto2);
  });

  it('trae el id de cada proyecto junto a su nombre', async () => {
    const { body } = await obtener('/proyectos/relacionados').expect(200);
    const nombres = new Map(
      (await leer('MATCH (p:Proyecto) RETURN p.id AS id, p.nombre AS nombre')).map((p) => [p.id, p.nombre] as const),
    );

    for (const fila of body.datos) {
      expect(nombres.get(fila.id1)).toBe(fila.proyecto1);
      expect(nombres.get(fila.id2)).toBe(fila.proyecto2);
      expect(fila.id1 < fila.id2).toBe(true);
    }
  });

  it('muestra las tecnologías compartidas', async () => {
    const { body } = await obtener('/proyectos/relacionados').expect(200);
    const fila = body.datos.find(
      (f: { proyecto1: string; proyecto2: string }) =>
        f.proyecto1 === 'Scoring Crediticio con ML' && f.proyecto2 === 'Lago de Datos Retail',
    );
    expect([...fila.tecnologias].sort()).toEqual(['AWS', 'Python', 'SQL']);
  });
});

describe('GET /proyectos/:id/colaboradores', () => {
  it('sugiere personas con sus tecnologías, sin incluir a los miembros', async () => {
    const res = await obtener('/proyectos/prj-07/colaboradores').expect(200);

    expect(res.body.datos[0]).toMatchObject({ id: 'usr-16', puntaje: 80 });
    expect(res.body.datos[0].habilidadesUtiles).toEqual(expect.arrayContaining(['Neo4j', 'Python']));

    const proyecto = await obtener('/proyectos/prj-07').expect(200);
    const sugeridos = ids(res.body.datos);
    for (const miembro of ids(proyecto.body.miembros)) expect(sugeridos).not.toContain(miembro);
  });

  it('dos miembros homónimos cuentan por separado', async () => {
    const [proyecto, usuario] = [await crearProyecto(), await crearUsuario()];
    await request(app).put(`/proyectos/${proyecto}/habilidades/go`).expect(200);
    await ponerHabilidad(usuario, 'go');
    for (let i = 0; i < 2; i++) {
      const miembro = await crearUsuario({ nombre: 'Homónimo' });
      await request(app).put(`/usuarios/${miembro}/proyectos/${proyecto}`).send({ rol: 'x' }).expect(200);
      await conectar(usuario, miembro);
    }

    const res = await obtener(`/proyectos/${proyecto}/colaboradores`).expect(200);

    const fila = res.body.datos.find((c: { id: string }) => c.id === usuario);
    expect(fila.contactosEnProyecto).toEqual(['Homónimo', 'Homónimo']);
  });

  it('un proyecto finalizado o sin tecnologías da lista vacía', async () => {
    const finalizado = await obtener('/proyectos/prj-01/colaboradores').expect(200);
    expect(finalizado.body).toEqual({ datos: [] });

    const sinTecnologias = await obtener(`/proyectos/${await crearProyecto()}/colaboradores`).expect(200);
    expect(sinTecnologias.body).toEqual({ datos: [] });
  });

  it('responde 404 si el proyecto no existe', async () => {
    const res = await obtener('/proyectos/no-existe/colaboradores').expect(404);
    expect(res.body.codigo).toBe('PROYECTO_NO_ENCONTRADO');
  });
});
