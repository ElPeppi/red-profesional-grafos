import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver, leer } from '../src/neo4j.js';
import {
  conMarca,
  contarRelaciones,
  crearEmpresa,
  crearOferta,
  crearUsuario,
  hoyEnColombia,
  limpiarDatosDePrueba,
  ofertaDePrueba,
  tipoDePropiedad,
} from './ayudas.js';

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('GET /ofertas', () => {
  it('lista las más recientes primero', async () => {
    const res = await request(app).get('/ofertas?limite=2').expect(200);

    expect(res.body).toMatchObject({ total: 15, pagina: 1, limite: 2 });
    expect(res.body.datos[0]).toEqual({
      id: 'of-15',
      titulo: 'Practicante de Desarrollo Web',
      nivel: 'junior',
      modalidad: 'presencial',
      estado: 'abierta',
      publicadaEn: '2026-10-29',
      empresa: { id: 'emp-01', nombre: 'Caribe Software' },
      ciudad: { id: 'barranquilla', nombre: 'Barranquilla' },
    });
    expect(res.body.datos[1].id).toBe('of-13');
  });

  it('la segunda página sigue donde terminó la primera', async () => {
    const res = await request(app).get('/ofertas?limite=2&pagina=2').expect(200);
    expect(res.body.datos.map((o: { id: string }) => o.id)).toEqual(['of-10', 'of-06']);
  });

  it('filtra por estado', async () => {
    const cerradas = await request(app).get('/ofertas?estado=cerrada').expect(200);
    expect(cerradas.body.total).toBe(1);
    expect(cerradas.body.datos[0].id).toBe('of-08');

    const abiertas = await request(app).get('/ofertas?estado=abierta').expect(200);
    expect(abiertas.body.total).toBe(14);
  });

  it('rechaza un estado que no existe', async () => {
    await request(app).get('/ofertas?estado=archivada').expect(400);
  });
});

describe('POST /ofertas', () => {
  it('nace abierta, con fecha de Colombia, empresa y ciudad', async () => {
    const empresaId = await crearEmpresa();
    const datos = ofertaDePrueba(empresaId, { ciudadId: 'cali', modalidad: 'híbrido', nivel: 'senior' });
    const res = await request(app).post('/ofertas').send(datos).expect(201);

    expect(res.body).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/),
      titulo: datos.titulo,
      nivel: 'senior',
      modalidad: 'híbrido',
      estado: 'abierta',
      publicadaEn: hoyEnColombia(),
      empresa: { id: empresaId, nombre: conMarca('Empresa') },
      ciudad: { id: 'cali', nombre: 'Cali' },
    });
  });

  it('rechaza una empresa o ciudad inexistente y no crea nada', async () => {
    const empresaId = await crearEmpresa();
    const titulo = conMarca('Huérfana');

    const sinEmpresa = await request(app).post('/ofertas').send(ofertaDePrueba('no-existe', { titulo })).expect(422);
    expect(sinEmpresa.body.codigo).toBe('EMPRESA_O_CIUDAD_NO_ENCONTRADA');
    await request(app).post('/ofertas').send(ofertaDePrueba(empresaId, { titulo, ciudadId: 'atlantida' })).expect(422);

    expect(await leer('MATCH (o:Oferta {titulo: $titulo}) RETURN o', { titulo })).toEqual([]);
  });

  it('valida nivel y modalidad', async () => {
    const empresaId = await crearEmpresa();
    await request(app).post('/ofertas').send(ofertaDePrueba(empresaId, { nivel: 'experto' })).expect(400);
    await request(app).post('/ofertas').send(ofertaDePrueba(empresaId, { modalidad: 'hibrido' })).expect(400);
  });

  it('no deja fijar el estado ni la fecha al crear', async () => {
    const empresaId = await crearEmpresa();
    await request(app).post('/ofertas').send(ofertaDePrueba(empresaId, { estado: 'cerrada' })).expect(400);
    await request(app).post('/ofertas').send(ofertaDePrueba(empresaId, { publicadaEn: '2000-01-01' })).expect(400);
  });
});

describe('GET /ofertas/:id', () => {
  it('muestra requisitos con las obligatorias primero', async () => {
    const res = await request(app).get('/ofertas/of-01').expect(200);

    expect(res.body).toMatchObject({ id: 'of-01', totalPostulaciones: 2, empresa: { id: 'emp-01' } });
    expect(res.body.habilidades.map((h: { id: string }) => h.id)).toEqual(['react', 'typescript', 'figma', 'html-css']);
    expect(res.body.habilidades[0]).toEqual({
      id: 'react',
      nombre: 'React',
      categoria: 'Frontend',
      nivelMinimo: 4,
      obligatoria: true,
    });
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app).get('/ofertas/no-existe').expect(404);
    expect(res.body.codigo).toBe('OFERTA_NO_ENCONTRADA');
  });
});

describe('PATCH /ofertas/:id', () => {
  it('cierra y reabre la oferta', async () => {
    const id = await crearOferta();
    const cerrada = await request(app).patch(`/ofertas/${id}`).send({ estado: 'cerrada' }).expect(200);
    expect(cerrada.body).toMatchObject({ id, estado: 'cerrada', titulo: conMarca('Oferta') });

    const abierta = await request(app).patch(`/ofertas/${id}`).send({ estado: 'abierta' }).expect(200);
    expect(abierta.body.estado).toBe('abierta');
  });

  it('cambia la ciudad sin dejar la anterior', async () => {
    const id = await crearOferta();
    const res = await request(app).patch(`/ofertas/${id}`).send({ ciudadId: 'cali' }).expect(200);

    expect(res.body.ciudad.id).toBe('cali');
    const filas = await leer('MATCH (:Oferta {id: $id})-[:UBICADA_EN]->(c:Ciudad) RETURN c.id AS id', { id });
    expect(filas).toEqual([{ id: 'cali' }]);
  });

  it('con una ciudad inexistente no guarda ningún cambio', async () => {
    const id = await crearOferta();
    await request(app).patch(`/ofertas/${id}`).send({ estado: 'cerrada', ciudadId: 'atlantida' }).expect(422);

    const res = await request(app).get(`/ofertas/${id}`).expect(200);
    expect(res.body.estado).toBe('abierta');
  });

  // Con un campo válido al lado: solo, el extra se quitaría y fallaría por cuerpo vacío.
  it('no cambia la empresa ni la fecha de publicación', async () => {
    const id = await crearOferta();
    await request(app).patch(`/ofertas/${id}`).send({ estado: 'cerrada', empresaId: 'emp-01' }).expect(400);
    await request(app).patch(`/ofertas/${id}`).send({ estado: 'cerrada', publicadaEn: '2000-01-01' }).expect(400);

    const res = await request(app).get(`/ofertas/${id}`).expect(200);
    expect(res.body.estado).toBe('abierta');
  });

  it('rechaza cuerpo vacío y estado inválido', async () => {
    const id = await crearOferta();
    await request(app).patch(`/ofertas/${id}`).send({}).expect(400);
    await request(app).patch(`/ofertas/${id}`).send({ estado: 'archivada' }).expect(400);
  });

  it('responde 404 si no existe', async () => {
    await request(app).patch('/ofertas/no-existe').send({ estado: 'cerrada' }).expect(404);
  });
});

describe('DELETE /ofertas/:id', () => {
  it('borra la oferta y sus postulaciones', async () => {
    const [id, usuarioId] = [await crearOferta(), await crearUsuario()];
    await request(app).post(`/ofertas/${id}/postulaciones`).send({ usuarioId }).expect(201);

    await request(app).delete(`/ofertas/${id}`).expect(204);

    await request(app).get(`/ofertas/${id}`).expect(404);
    const res = await request(app).get(`/usuarios/${usuarioId}/postulaciones`).expect(200);
    expect(res.body.postulaciones).toEqual([]);
  });

  it('responde 404 si no existe', async () => {
    await request(app).delete('/ofertas/no-existe').expect(404);
  });
});

describe('Habilidades de una oferta', () => {
  const poner = (oferta: string, habilidad: string, cuerpo: object) =>
    request(app).put(`/ofertas/${oferta}/habilidades/${habilidad}`).send(cuerpo);

  it('agrega el requisito y aparece en el detalle', async () => {
    const id = await crearOferta();
    const res = await poner(id, 'react', { nivelMinimo: 3, obligatoria: true }).expect(200);

    expect(res.body).toEqual({ id: 'react', nombre: 'React', categoria: 'Frontend', nivelMinimo: 3, obligatoria: true });
    const detalle = await request(app).get(`/ofertas/${id}`).expect(200);
    expect(detalle.body.habilidades).toEqual([res.body]);
  });

  it('es opcional si no se indica', async () => {
    const id = await crearOferta();
    const res = await poner(id, 'react', { nivelMinimo: 3 }).expect(200);
    expect(res.body.obligatoria).toBe(false);
  });

  it('repetir actualiza sin duplicar', async () => {
    const id = await crearOferta();
    await poner(id, 'react', { nivelMinimo: 2 }).expect(200);
    const res = await poner(id, 'react', { nivelMinimo: 5, obligatoria: true }).expect(200);

    expect(res.body).toMatchObject({ nivelMinimo: 5, obligatoria: true });
    expect(await contarRelaciones('REQUIERE', id, 'react')).toBe(1);
  });

  it('guarda el nivel mínimo como entero', async () => {
    const id = await crearOferta();
    await poner(id, 'react', { nivelMinimo: 3 }).expect(200);
    expect(await tipoDePropiedad('nivelMinimo', id, 'react')).toBe('INTEGER NOT NULL');
  });

  it('valida el nivel mínimo', async () => {
    const id = await crearOferta();
    await poner(id, 'react', { nivelMinimo: 0 }).expect(400);
    await poner(id, 'react', { nivelMinimo: 6 }).expect(400);
    await poner(id, 'react', {}).expect(400);
  });

  it('responde 404 si falta la oferta o la habilidad', async () => {
    const id = await crearOferta();
    await poner('no-existe', 'react', { nivelMinimo: 3 }).expect(404);
    await poner(id, 'no-existe', { nivelMinimo: 3 }).expect(404);
  });

  it('quita el requisito; la segunda vez responde 404', async () => {
    const id = await crearOferta();
    await poner(id, 'react', { nivelMinimo: 3 }).expect(200);

    await request(app).delete(`/ofertas/${id}/habilidades/react`).expect(204);
    expect(await contarRelaciones('REQUIERE', id, 'react')).toBe(0);

    const res = await request(app).delete(`/ofertas/${id}/habilidades/react`).expect(404);
    expect(res.body.mensaje).toBe('La oferta no pide esa habilidad');
  });
});
