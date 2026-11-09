import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver } from '../src/neo4j.js';

afterAll(cerrarDriver);

describe('GET /ciudades', () => {
  it('lista las ciudades por nombre', async () => {
    const res = await request(app).get('/ciudades').expect(200);

    expect(res.body.datos).toHaveLength(6);
    expect(res.body.datos[0]).toEqual({ id: 'barranquilla', nombre: 'Barranquilla', departamento: 'Atlántico' });
  });
});

describe('GET /habilidades', () => {
  it('lista las habilidades por categoría y nombre', async () => {
    const res = await request(app).get('/habilidades').expect(200);

    expect(res.body.datos).toHaveLength(29);
    expect(res.body.datos[0]).toEqual({ id: 'django', nombre: 'Django', categoria: 'Backend' });
    expect(res.body.datos.at(-1)).toEqual({ id: 'kotlin', nombre: 'Kotlin', categoria: 'Móvil' });
  });
});
