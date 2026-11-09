import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { consulta } from '../src/consultas.js';
import { cerrarDriver, escribir } from '../src/neo4j.js';
import {
  abrirConexiones,
  contarRelaciones,
  crearOferta,
  crearUsuario,
  hoyEnColombia,
  limpiarDatosDePrueba,
} from './ayudas.js';

const postular = (ofertaId: string, usuarioId: string) =>
  request(app).post(`/ofertas/${ofertaId}/postulaciones`).send({ usuarioId });

const cambiarEstado = (ofertaId: string, usuarioId: string, estado: string) =>
  request(app).patch(`/ofertas/${ofertaId}/postulaciones/${usuarioId}`).send({ estado });

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('POST /ofertas/:id/postulaciones', () => {
  it('registra la postulación como enviada, con fecha de Colombia', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    const res = await postular(ofertaId, usuarioId).expect(201);

    expect(res.body).toEqual({ usuarioId, ofertaId, fecha: hoyEnColombia(), estado: 'enviada' });
    expect(await contarRelaciones('POSTULA_A', usuarioId, ofertaId)).toBe(1);
  });

  it('no permite postularse dos veces', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, usuarioId).expect(201);

    const res = await postular(ofertaId, usuarioId).expect(409);

    expect(res.body.codigo).toBe('YA_POSTULADO');
    expect(await contarRelaciones('POSTULA_A', usuarioId, ofertaId)).toBe(1);
  });

  it('no sobrescribe el avance al repetir', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, usuarioId).expect(201);
    await cambiarEstado(ofertaId, usuarioId, 'entrevista').expect(200);

    await postular(ofertaId, usuarioId).expect(409);

    const res = await request(app).get(`/ofertas/${ofertaId}/postulaciones`).expect(200);
    expect(res.body.postulantes[0].estado).toBe('entrevista');
  });

  it('no permite postularse a una oferta cerrada', async () => {
    const usuarioId = await crearUsuario();
    const res = await postular('of-08', usuarioId).expect(409);

    expect(res.body.codigo).toBe('OFERTA_CERRADA');
    expect(await contarRelaciones('POSTULA_A', usuarioId, 'of-08')).toBe(0);
  });

  it('responde 404 si falta el usuario o la oferta', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, 'no-existe').expect(404);
    const res = await postular('no-existe', usuarioId).expect(404);
    expect(res.body.mensaje).toBe('No existe el usuario o la oferta');
  });

  it('exige el usuario y rechaza campos desconocidos', async () => {
    const ofertaId = await crearOferta();
    await request(app).post(`/ofertas/${ofertaId}/postulaciones`).send({}).expect(400);
    await request(app).post(`/ofertas/${ofertaId}/postulaciones`).send({ usuarioId: 'x', estado: 'aceptada' }).expect(400);
  });

  it('veinte clics simultáneos dejan una sola postulación', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await abrirConexiones();
    const respuestas = await Promise.all(Array.from({ length: 20 }, () => postular(ofertaId, usuarioId)));

    expect(respuestas.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    expect(await contarRelaciones('POSTULA_A', usuarioId, ofertaId)).toBe(1);
  });

  // Directo a la consulta: por la API, la revisión previa nunca deja llegar al segundo MERGE.
  it('ON CREATE: una postulación que ya existe conserva su avance', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, usuarioId).expect(201);
    await cambiarEstado(ofertaId, usuarioId, 'entrevista').expect(200);

    const [fila] = await escribir(consulta('crearPostulacion'), { usuarioId, ofertaId });

    expect(fila?.estado).toBe('entrevista');
  });

  // Directo a la consulta: por la API, la revisión previa frena a casi todos antes del MERGE.
  it('MERGE no duplica aunque las escrituras se solapen en la base', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await abrirConexiones();

    await Promise.all(Array.from({ length: 20 }, () => escribir(consulta('crearPostulacion'), { usuarioId, ofertaId })));

    expect(await contarRelaciones('POSTULA_A', usuarioId, ofertaId)).toBe(1);
  });
});

describe('PATCH /ofertas/:id/postulaciones/:usuarioId', () => {
  it('cambia el estado y conserva la fecha', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, usuarioId).expect(201);

    const res = await cambiarEstado(ofertaId, usuarioId, 'en revisión').expect(200);

    expect(res.body).toEqual({ usuarioId, ofertaId, fecha: hoyEnColombia(), estado: 'en revisión' });
  });

  it('rechaza un estado que no existe', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, usuarioId).expect(201);
    await cambiarEstado(ofertaId, usuarioId, 'contratada').expect(400);
  });

  it('responde 404 si no hay postulación, y no la crea', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    const res = await cambiarEstado(ofertaId, usuarioId, 'entrevista').expect(404);

    expect(res.body.codigo).toBe('POSTULACION_NO_ENCONTRADA');
    expect(await contarRelaciones('POSTULA_A', usuarioId, ofertaId)).toBe(0);
  });
});

describe('GET /ofertas/:id/postulaciones', () => {
  it('lista los postulantes de una oferta semilla, los más recientes primero', async () => {
    const res = await request(app).get('/ofertas/of-02/postulaciones').expect(200);

    expect(res.body.postulantes.map((u: { id: string }) => u.id)).toEqual(['usr-40', 'usr-29', 'usr-10', 'usr-03']);
    expect(res.body.postulantes[3]).toEqual({
      id: 'usr-03',
      nombre: expect.any(String),
      titular: expect.any(String),
      fecha: '2026-10-07',
      estado: 'en revisión',
    });
  });

  it('sin postulantes da lista vacía, no error', async () => {
    const ofertaId = await crearOferta();
    const res = await request(app).get(`/ofertas/${ofertaId}/postulaciones`).expect(200);
    expect(res.body).toEqual({ postulantes: [] });
  });

  it('responde 404 si la oferta no existe', async () => {
    await request(app).get('/ofertas/no-existe/postulaciones').expect(404);
  });
});

describe('GET /usuarios/:id/postulaciones', () => {
  it('lista las de un usuario semilla, la más reciente primero', async () => {
    const res = await request(app).get('/usuarios/usr-04/postulaciones').expect(200);

    expect(res.body.postulaciones).toEqual([
      {
        id: 'of-15',
        titulo: 'Practicante de Desarrollo Web',
        estadoOferta: 'abierta',
        empresa: 'Caribe Software',
        fecha: '2026-10-30',
        estado: 'entrevista',
      },
      {
        id: 'of-01',
        titulo: 'Desarrollador Frontend React',
        estadoOferta: 'abierta',
        empresa: 'Caribe Software',
        fecha: '2026-10-03',
        estado: 'rechazada',
      },
    ]);
  });

  it('responde 404 si el usuario no existe', async () => {
    await request(app).get('/usuarios/no-existe/postulaciones').expect(404);
  });
});

describe('Al borrar un usuario', () => {
  it('desaparecen sus postulaciones', async () => {
    const [ofertaId, usuarioId] = [await crearOferta(), await crearUsuario()];
    await postular(ofertaId, usuarioId).expect(201);

    await request(app).delete(`/usuarios/${usuarioId}`).expect(204);

    const res = await request(app).get(`/ofertas/${ofertaId}/postulaciones`).expect(200);
    expect(res.body.postulantes).toEqual([]);
  });
});
