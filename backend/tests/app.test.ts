import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver } from '../src/neo4j.js';

afterAll(cerrarDriver);

describe('API general', () => {
  it('/salud confirma la conexión con Neo4j', async () => {
    const res = await request(app).get('/salud').expect(200);
    expect(res.body).toEqual({ estado: 'ok', neo4j: expect.stringContaining('Neo4j/5.26') });
  });

  it('responde 404 en JSON para una ruta inexistente', async () => {
    const res = await request(app).get('/no-existe').expect(404);
    expect(res.body.codigo).toBe('RUTA_NO_ENCONTRADA');
  });

  it('responde 400 si el cuerpo no es JSON válido', async () => {
    const res = await request(app)
      .post('/usuarios')
      .set('Content-Type', 'application/json')
      .send('{ esto no es json')
      .expect(400);
    expect(res.body.codigo).toBe('JSON_INVALIDO');
  });

  it('no anuncia qué tecnología usa el servidor', async () => {
    const res = await request(app).get('/salud');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
