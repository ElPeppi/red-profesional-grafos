import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver, leer } from '../src/neo4j.js';
import {
  conMarca,
  crearEmpresa,
  crearProyecto,
  crearUsuario,
  empresaDePrueba,
  limpiarDatosDePrueba,
  ofertaDePrueba,
} from './ayudas.js';

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('GET /empresas', () => {
  it('lista los datos semilla ordenados y paginados', async () => {
    const res = await request(app).get('/empresas?limite=3').expect(200);

    expect(res.body).toMatchObject({ pagina: 1, limite: 3 });
    expect(res.body.total).toBeGreaterThanOrEqual(8);
    expect(res.body.datos[0]).toEqual({
      id: 'emp-08',
      nombre: 'AgroSinú Tech',
      sector: 'Agrotech',
      ciudad: { id: 'monteria', nombre: 'Montería', departamento: 'Córdoba' },
    });

    const siguiente = await request(app).get('/empresas?limite=3&pagina=2').expect(200);
    const ids = [...res.body.datos, ...siguiente.body.datos].map((e: { id: string }) => e.id);
    expect(new Set(ids).size).toBe(6);
  });

  it('una página más allá del final da lista vacía', async () => {
    const res = await request(app).get('/empresas?pagina=999').expect(200);
    expect(res.body.datos).toEqual([]);
    expect(res.body.total).toBeGreaterThanOrEqual(8);
  });

  it('valida la paginación', async () => {
    await request(app).get('/empresas?limite=0').expect(400);
  });
});

describe('POST /empresas', () => {
  it('crea la empresa con UUID y su ciudad', async () => {
    const datos = empresaDePrueba({ ciudadId: 'cali' });
    const res = await request(app).post('/empresas').send(datos).expect(201);

    expect(res.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      nombre: datos.nombre,
      sector: datos.sector,
      ciudad: { id: 'cali', nombre: 'Cali', departamento: 'Valle del Cauca' },
    });
  });

  it('rechaza una ciudad inexistente y no crea nada', async () => {
    const nombre = conMarca('Sin ciudad');
    const res = await request(app).post('/empresas').send(empresaDePrueba({ nombre, ciudadId: 'atlantida' })).expect(422);

    expect(res.body.codigo).toBe('CIUDAD_NO_ENCONTRADA');
    expect(await leer('MATCH (e:Empresa {nombre: $nombre}) RETURN e', { nombre })).toEqual([]);
  });

  it('exige los campos y rechaza un id enviado por el cliente', async () => {
    await request(app).post('/empresas').send(empresaDePrueba({ nombre: '  ' })).expect(400);
    await request(app).post('/empresas').send(empresaDePrueba({ sector: undefined })).expect(400);
    await request(app).post('/empresas').send(empresaDePrueba({ id: 'mio' })).expect(400);
  });
});

describe('GET /empresas/:id', () => {
  it('muestra ofertas, proyectos y empleados de una empresa semilla', async () => {
    const res = await request(app).get('/empresas/emp-01').expect(200);

    expect(res.body).toMatchObject({ id: 'emp-01', totalEmpleados: 5, ciudad: { id: 'barranquilla' } });
    expect(res.body.ofertas.map((o: { id: string }) => o.id)).toEqual(['of-15', 'of-02', 'of-01']);
    expect(res.body.proyectos.map((p: { id: string }) => p.id)).toEqual(['prj-02']);
  });

  it('no cuenta como empleados a quienes ya no trabajan ahí', async () => {
    const empresa = await crearEmpresa();
    const usuario = await crearUsuario();
    await request(app)
      .put(`/usuarios/${usuario}/empleos/${empresa}`)
      .send({ cargo: 'Antes', desde: '2020-01-01', actual: false })
      .expect(200);

    const res = await request(app).get(`/empresas/${empresa}`).expect(200);
    expect(res.body.totalEmpleados).toBe(0);
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app).get('/empresas/no-existe').expect(404);
    expect(res.body.codigo).toBe('EMPRESA_NO_ENCONTRADA');
  });
});

describe('PATCH /empresas/:id', () => {
  it('cambia solo lo enviado', async () => {
    const id = await crearEmpresa();
    const res = await request(app).patch(`/empresas/${id}`).send({ sector: 'Otro' }).expect(200);

    expect(res.body).toMatchObject({ id, sector: 'Otro', nombre: conMarca('Empresa') });
  });

  it('cambia la ciudad sin dejar la anterior', async () => {
    const id = await crearEmpresa();
    const res = await request(app).patch(`/empresas/${id}`).send({ ciudadId: 'bogota' }).expect(200);

    expect(res.body.ciudad.id).toBe('bogota');
    const filas = await leer('MATCH (:Empresa {id: $id})-[:UBICADA_EN]->(c:Ciudad) RETURN c.id AS id', { id });
    expect(filas).toEqual([{ id: 'bogota' }]);
  });

  it('con una ciudad inexistente no guarda ningún cambio', async () => {
    const id = await crearEmpresa();
    await request(app).patch(`/empresas/${id}`).send({ sector: 'Otro', ciudadId: 'atlantida' }).expect(422);

    const res = await request(app).get(`/empresas/${id}`).expect(200);
    expect(res.body).toMatchObject({ sector: 'Pruebas', ciudad: { id: 'barranquilla' } });
  });

  // Con un campo válido al lado: solo, el extra se quitaría y fallaría por cuerpo vacío.
  it('rechaza un cuerpo vacío y campos desconocidos', async () => {
    const id = await crearEmpresa();
    await request(app).patch(`/empresas/${id}`).send({}).expect(400);
    await request(app).patch(`/empresas/${id}`).send({ sector: 'Otro', id: 'otro' }).expect(400);
  });

  it('responde 404 si no existe', async () => {
    await request(app).patch('/empresas/no-existe').send({ sector: 'x' }).expect(404);
  });
});

describe('DELETE /empresas/:id', () => {
  it('borra una empresa sin ofertas', async () => {
    const id = await crearEmpresa();
    await request(app).delete(`/empresas/${id}`).expect(204);
    await request(app).get(`/empresas/${id}`).expect(404);
  });

  it('no borra una empresa con ofertas', async () => {
    const id = await crearEmpresa();
    const oferta = await request(app).post('/ofertas').send(ofertaDePrueba(id)).expect(201);

    const res = await request(app).delete(`/empresas/${id}`).expect(409);

    expect(res.body).toEqual({
      codigo: 'EMPRESA_CON_OFERTAS',
      mensaje: 'Ofertas publicadas por la empresa: 1. Bórralas primero',
    });
    await request(app).get(`/empresas/${id}`).expect(200);
    const detalle = await request(app).get(`/ofertas/${oferta.body.id}`).expect(200);
    expect(detalle.body.empresa.id).toBe(id);
  });

  it('se puede borrar al quitarle sus ofertas', async () => {
    const id = await crearEmpresa();
    const oferta = await request(app).post('/ofertas').send(ofertaDePrueba(id)).expect(201);

    await request(app).delete(`/ofertas/${oferta.body.id}`).expect(204);
    await request(app).delete(`/empresas/${id}`).expect(204);
  });

  it('sus proyectos siguen, sin empresa', async () => {
    const empresaId = await crearEmpresa();
    const proyecto = await crearProyecto({ empresaId });

    await request(app).delete(`/empresas/${empresaId}`).expect(204);

    const res = await request(app).get(`/proyectos/${proyecto}`).expect(200);
    expect(res.body.empresa).toBeNull();
  });

  it('los empleados conservan su perfil, sin ese empleo', async () => {
    const [empresa, usuario] = [await crearEmpresa(), await crearUsuario()];
    await request(app)
      .put(`/usuarios/${usuario}/empleos/${empresa}`)
      .send({ cargo: 'x', desde: '2020-01-01' })
      .expect(200);

    await request(app).delete(`/empresas/${empresa}`).expect(204);

    const res = await request(app).get(`/usuarios/${usuario}`).expect(200);
    expect(res.body.empleos).toEqual([]);
  });

  it('responde 404 si no existe', async () => {
    await request(app).delete('/empresas/no-existe').expect(404);
  });
});
