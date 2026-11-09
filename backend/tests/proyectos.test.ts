import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver, leer } from '../src/neo4j.js';
import {
  conMarca,
  contarRelaciones,
  crearEmpresa,
  crearProyecto,
  crearUsuario,
  limpiarDatosDePrueba,
} from './ayudas.js';

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('GET /proyectos', () => {
  it('lista por nombre e indica la empresa', async () => {
    const res = await request(app).get('/proyectos?limite=2').expect(200);

    expect(res.body).toMatchObject({ total: 12, pagina: 1, limite: 2 });
    expect(res.body.datos[0]).toEqual({
      id: 'prj-03',
      nombre: 'App Móvil de Entregas',
      descripcion: 'App para conductores con rutas y confirmación de entregas',
      estado: 'en curso',
      empresa: { id: 'emp-02', nombre: 'Puerto Logística Digital' },
    });
  });

  it('la segunda página sigue donde terminó la primera', async () => {
    const primera = await request(app).get('/proyectos?limite=2').expect(200);
    const segunda = await request(app).get('/proyectos?limite=2&pagina=2').expect(200);

    const ids = [...primera.body.datos, ...segunda.body.datos].map((p: { id: string }) => p.id);
    expect(new Set(ids).size).toBe(4);
  });

  it('un proyecto comunitario no tiene empresa', async () => {
    const res = await request(app).get('/proyectos?limite=100').expect(200);
    const comunitario = res.body.datos.find((p: { id: string }) => p.id === 'prj-12');
    expect(comunitario.empresa).toBeNull();
  });
});

describe('POST /proyectos', () => {
  it('crea un proyecto comunitario, en curso por defecto', async () => {
    const nombre = conMarca('Comunitario');
    const res = await request(app).post('/proyectos').send({ nombre }).expect(201);

    expect(res.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      nombre,
      descripcion: '',
      estado: 'en curso',
      empresa: null,
    });
  });

  it('lo vincula a la empresa que lo desarrolla', async () => {
    const empresaId = await crearEmpresa();
    const res = await request(app)
      .post('/proyectos')
      .send({ nombre: conMarca('De empresa'), descripcion: 'Algo', estado: 'finalizado', empresaId })
      .expect(201);

    expect(res.body).toMatchObject({
      descripcion: 'Algo',
      estado: 'finalizado',
      empresa: { id: empresaId, nombre: conMarca('Empresa') },
    });
    expect(await contarRelaciones('DESARROLLA', empresaId, res.body.id)).toBe(1);
  });

  it('rechaza una empresa inexistente y no crea nada', async () => {
    const nombre = conMarca('Sin empresa real');
    const res = await request(app).post('/proyectos').send({ nombre, empresaId: 'no-existe' }).expect(422);

    expect(res.body).toEqual({ codigo: 'EMPRESA_NO_ENCONTRADA', mensaje: 'No existe la empresa no-existe' });
    expect(await leer('MATCH (p:Proyecto {nombre: $nombre}) RETURN p', { nombre })).toEqual([]);
  });

  it('valida nombre, estado y campos desconocidos', async () => {
    await request(app).post('/proyectos').send({ nombre: ' ' }).expect(400);
    await request(app).post('/proyectos').send({ nombre: conMarca('x'), estado: 'pausado' }).expect(400);
    await request(app).post('/proyectos').send({ nombre: conMarca('x'), id: 'mio' }).expect(400);
  });
});

describe('GET /proyectos/:id', () => {
  it('muestra empresa, tecnologías y miembros', async () => {
    const res = await request(app).get('/proyectos/prj-02').expect(200);

    expect(res.body.empresa).toEqual({ id: 'emp-01', nombre: 'Caribe Software' });
    expect(res.body.tecnologias.map((h: { nombre: string }) => h.nombre)).toEqual([
      'Node.js',
      'React',
      'SQL',
      'TypeScript',
    ]);
    expect(res.body.miembros).toHaveLength(5);
    expect(res.body.miembros.find((m: { id: string }) => m.id === 'usr-02').rol).toBe('Tech Lead');
  });

  it('muestra un proyecto comunitario con su empresa en nulo', async () => {
    const res = await request(app).get('/proyectos/prj-12').expect(200);
    expect(res.body).toMatchObject({ id: 'prj-12', empresa: null });
    expect(res.body.miembros).toHaveLength(4);
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app).get('/proyectos/no-existe').expect(404);
    expect(res.body.codigo).toBe('PROYECTO_NO_ENCONTRADO');
  });
});

describe('PATCH /proyectos/:id', () => {
  it('cambia solo lo enviado y conserva la empresa', async () => {
    const empresaId = await crearEmpresa();
    const id = await crearProyecto({ empresaId, descripcion: 'Antes' });

    const res = await request(app).patch(`/proyectos/${id}`).send({ estado: 'finalizado' }).expect(200);

    expect(res.body).toMatchObject({ id, estado: 'finalizado', descripcion: 'Antes', empresa: { id: empresaId } });
  });

  it('no aplica valores por defecto a lo que no llega', async () => {
    const id = await crearProyecto({ descripcion: 'Antes', estado: 'finalizado' });
    const res = await request(app).patch(`/proyectos/${id}`).send({ nombre: conMarca('Nuevo') }).expect(200);
    expect(res.body).toMatchObject({ descripcion: 'Antes', estado: 'finalizado' });
  });

  // Con un campo válido al lado: solo, el extra se quitaría y fallaría por cuerpo vacío.
  it('no cambia la empresa', async () => {
    const id = await crearProyecto();
    await request(app).patch(`/proyectos/${id}`).send({ estado: 'finalizado', empresaId: 'emp-01' }).expect(400);
  });

  it('rechaza cuerpo vacío y estado inválido', async () => {
    const id = await crearProyecto();
    await request(app).patch(`/proyectos/${id}`).send({}).expect(400);
    await request(app).patch(`/proyectos/${id}`).send({ estado: 'pausado' }).expect(400);
  });

  it('responde 404 si no existe', async () => {
    await request(app).patch('/proyectos/no-existe').send({ estado: 'finalizado' }).expect(404);
  });
});

describe('DELETE /proyectos/:id', () => {
  it('borra el proyecto y sale del perfil de sus miembros', async () => {
    const [id, usuario] = [await crearProyecto(), await crearUsuario()];
    await request(app).put(`/usuarios/${usuario}/proyectos/${id}`).send({ rol: 'x' }).expect(200);

    await request(app).delete(`/proyectos/${id}`).expect(204);

    await request(app).get(`/proyectos/${id}`).expect(404);
    const perfil = await request(app).get(`/usuarios/${usuario}`).expect(200);
    expect(perfil.body.proyectos).toEqual([]);
  });

  it('responde 404 si no existe', async () => {
    await request(app).delete('/proyectos/no-existe').expect(404);
  });
});

describe('Tecnologías de un proyecto', () => {
  it('agrega la tecnología y repetir no duplica', async () => {
    const id = await crearProyecto();
    await request(app).put(`/proyectos/${id}/habilidades/react`).expect(200);
    const res = await request(app).put(`/proyectos/${id}/habilidades/react`).expect(200);

    expect(res.body).toEqual({ id: 'react', nombre: 'React', categoria: 'Frontend' });
    expect(await contarRelaciones('USA', id, 'react')).toBe(1);
    const detalle = await request(app).get(`/proyectos/${id}`).expect(200);
    expect(detalle.body.tecnologias).toEqual([res.body]);
  });

  it('responde 404 si falta el proyecto o la habilidad', async () => {
    const id = await crearProyecto();
    await request(app).put('/proyectos/no-existe/habilidades/react').expect(404);
    await request(app).put(`/proyectos/${id}/habilidades/no-existe`).expect(404);
  });

  it('quita la tecnología; la segunda vez responde 404', async () => {
    const id = await crearProyecto();
    await request(app).put(`/proyectos/${id}/habilidades/react`).expect(200);

    await request(app).delete(`/proyectos/${id}/habilidades/react`).expect(204);
    expect(await contarRelaciones('USA', id, 'react')).toBe(0);

    const res = await request(app).delete(`/proyectos/${id}/habilidades/react`).expect(404);
    expect(res.body.mensaje).toBe('El proyecto no usa esa tecnología');
  });
});
