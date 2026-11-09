import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { cerrarDriver, escribir, leer } from '../src/neo4j.js';
import { terminoLucene } from '../src/repositorios/usuarios.js';
import { emailDePrueba, limpiarDatosDePrueba, usuarioDePrueba } from './ayudas.js';

const crear = (extra: Record<string, unknown> = {}) => request(app).post('/usuarios').send(usuarioDePrueba(extra));

const tipoEnNeo4j = async (id: string) => {
  const filas = await leer('MATCH (u:Usuario {id: $id}) RETURN valueType(u.aniosExperiencia) AS tipo', { id });
  return filas[0]?.tipo;
};

// Una corrida interrumpida pudo dejar datos: se limpia antes y después.
beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('POST /usuarios', () => {
  it('crea el usuario con UUID, fecha ISO y su ciudad', async () => {
    const datos = usuarioDePrueba();
    const res = await request(app).post('/usuarios').send(datos).expect(201);

    expect(res.body).toMatchObject({
      nombre: datos.nombre,
      email: datos.email,
      aniosExperiencia: 3,
      abiertoAOfertas: true,
      ciudad: { id: 'barranquilla', nombre: 'Barranquilla' },
    });
    expect(res.body.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(new Date(res.body.creadoEn).toISOString()).toBe(res.body.creadoEn);
  });

  it('conserva tildes y eñes, y las encuentra al buscar', async () => {
    const nombre = 'Ñandú Peña Núñez';
    const res = await crear({ nombre }).expect(201);
    expect(res.body.nombre).toBe(nombre);

    const busqueda = await request(app).get('/usuarios').query({ busqueda: 'ñandu' }).expect(200);
    expect(busqueda.body.datos.map((u: { id: string }) => u.id)).toContain(res.body.id);
  });

  it('guarda aniosExperiencia como entero, no como decimal', async () => {
    const res = await crear({ aniosExperiencia: 7 }).expect(201);
    expect(await tipoEnNeo4j(res.body.id)).toBe('INTEGER NOT NULL');
  });

  it('aplica valores por defecto a los campos opcionales', async () => {
    const res = await request(app)
      .post('/usuarios')
      .send({ nombre: 'Mínimo', email: emailDePrueba(), ciudadId: 'cali' })
      .expect(201);
    expect(res.body).toMatchObject({ titular: '', aniosExperiencia: 0, abiertoAOfertas: false });
  });

  it('rechaza un email repetido, sin importar mayúsculas', async () => {
    const email = emailDePrueba();
    await crear({ email }).expect(201);
    const res = await crear({ email: email.toUpperCase() }).expect(409);
    expect(res.body).toEqual({ codigo: 'YA_EXISTE', mensaje: 'Ya existe un registro con ese valor único' });
  });

  it('rechaza una ciudad inexistente y no crea nada', async () => {
    const email = emailDePrueba();
    const res = await crear({ email, ciudadId: 'atlantida' }).expect(422);
    expect(res.body).toEqual({ codigo: 'CIUDAD_NO_ENCONTRADA', mensaje: 'No existe la ciudad atlantida' });
    expect(await leer('MATCH (u:Usuario {email: $email}) RETURN u', { email })).toEqual([]);
  });

  it('explica qué campos son inválidos', async () => {
    const res = await request(app)
      .post('/usuarios')
      .send({ nombre: '', email: 'sin-arroba', aniosExperiencia: 2.5, ciudadId: 'cali' })
      .expect(400);
    expect(res.body.codigo).toBe('DATOS_INVALIDOS');
    expect(res.body.campos.map((c: { campo: string }) => c.campo).sort()).toEqual([
      'aniosExperiencia',
      'email',
      'nombre',
    ]);
  });

  it('no deja fijar campos que controla el servidor', async () => {
    await crear({ id: 'usr-01' }).expect(400);
    await crear({ creadoEn: '2000-01-01' }).expect(400);
  });
});

describe('GET /usuarios/:id', () => {
  it('devuelve el perfil completo de un usuario semilla', async () => {
    const res = await request(app).get('/usuarios/usr-01').expect(200);

    expect(res.body).toMatchObject({
      id: 'usr-01',
      nombre: 'Andrea Pérez',
      ciudad: { id: 'barranquilla' },
      totalConexiones: 4,
    });
    expect(res.body.habilidades).toHaveLength(5);
    expect(res.body.habilidades[0]).toEqual({ id: expect.any(String), nombre: expect.any(String), categoria: expect.any(String), nivel: 5 });
    const niveles = res.body.habilidades.map((h: { nivel: number }) => h.nivel);
    expect(niveles).toEqual([...niveles].sort((a, b) => b - a));
    expect(res.body.empleos[0].desde).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('responde 404 si no existe', async () => {
    const res = await request(app).get('/usuarios/no-existe').expect(404);
    expect(res.body).toEqual({ codigo: 'USUARIO_NO_ENCONTRADO', mensaje: 'No existe el usuario no-existe' });
  });
});

describe('GET /usuarios', () => {
  it('pagina sin repetir filas', async () => {
    const p1 = await request(app).get('/usuarios?limite=5&pagina=1').expect(200);
    const p2 = await request(app).get('/usuarios?limite=5&pagina=2').expect(200);
    const ids = [...p1.body.datos, ...p2.body.datos].map((u: { id: string }) => u.id);

    expect(new Set(ids).size).toBe(10);
    expect(p1.body).toMatchObject({ pagina: 1, limite: 5 });
    expect(p1.body.total).toBeGreaterThanOrEqual(40);
  });

  it('valida los parámetros de paginación', async () => {
    await request(app).get('/usuarios?limite=0').expect(400);
    await request(app).get('/usuarios?limite=101').expect(400);
    await request(app).get('/usuarios?pagina=abc').expect(400);
  });

  it('una página pasada del final viene vacía', async () => {
    const res = await request(app).get('/usuarios?pagina=9999').expect(200);
    expect(res.body.datos).toEqual([]);
  });

  describe('búsqueda', () => {
    const buscar = async (texto: string) => {
      const res = await request(app).get('/usuarios').query({ busqueda: texto }).expect(200);
      return res.body;
    };
    const ids = (cuerpo: { datos: { id: string }[] }) => cuerpo.datos.map((u) => u.id);

    it('encuentra por nombre exacto', async () => {
      expect(ids(await buscar('Carlos'))[0]).toBe('usr-02');
    });

    it('encuentra por prefijo', async () => {
      expect(ids(await buscar('Carol'))).toContain('usr-31');
    });

    it('tolera tildes faltantes y errores de escritura', async () => {
      expect(ids(await buscar('Mejia'))).toContain('usr-02');
      expect(ids(await buscar('Carlso'))).toContain('usr-02');
    });

    it('busca también en el titular', async () => {
      expect(ids(await buscar('Tech Lead'))).toContain('usr-02');
    });

    it('exige todas las palabras', async () => {
      expect((await buscar('Carlos Andrea')).total).toBe(0);
    });

    it('total cuenta todos los resultados, no solo la página', async () => {
      const res = await request(app).get('/usuarios').query({ busqueda: 'Desarrollador', limite: 2 }).expect(200);
      expect(res.body.datos).toHaveLength(2);
      expect(res.body.total).toBeGreaterThan(2);
    });

    it('no se rompe con sintaxis de Lucene en la entrada', async () => {
      await buscar('foo(bar:"');
      await buscar('a AND OR NOT');
      await buscar('*~^[]{}!');
      expect((await buscar('((')).total).toBe(0);
    });

    it('busqueda vacía lista todos', async () => {
      expect((await buscar('')).total).toBeGreaterThanOrEqual(40);
    });
  });

  it('terminoLucene solo deja letras y números', () => {
    expect(terminoLucene('Peña 2')).toBe('(peña* OR peña~1) AND (2* OR 2~1)');
    expect(terminoLucene('a:b')).toBe('(a* OR a~1) AND (b* OR b~1)');
    expect(terminoLucene('!!!')).toBeNull();
  });
});

describe('PATCH /usuarios/:id', () => {
  it('cambia solo lo enviado', async () => {
    const { body: creado } = await crear().expect(201);
    const res = await request(app).patch(`/usuarios/${creado.id}`).send({ titular: 'Nuevo titular' }).expect(200);

    expect(res.body).toEqual({ ...creado, titular: 'Nuevo titular' });
  });

  it('mantiene aniosExperiencia como entero', async () => {
    const { body: creado } = await crear().expect(201);
    await request(app).patch(`/usuarios/${creado.id}`).send({ aniosExperiencia: 9 }).expect(200);
    expect(await tipoEnNeo4j(creado.id)).toBe('INTEGER NOT NULL');
  });

  it('cambia la ciudad dejando una sola relación VIVE_EN', async () => {
    const { body: creado } = await crear({ ciudadId: 'cali' }).expect(201);
    const res = await request(app).patch(`/usuarios/${creado.id}`).send({ ciudadId: 'medellin' }).expect(200);

    expect(res.body.ciudad.id).toBe('medellin');
    const filas = await leer('MATCH (:Usuario {id: $id})-[:VIVE_EN]->(c) RETURN c.id AS ciudad', { id: creado.id });
    expect(filas).toEqual([{ ciudad: 'medellin' }]);
  });

  it('si la ciudad no existe no guarda ningún cambio', async () => {
    const { body: creado } = await crear({ titular: 'Original', ciudadId: 'cali' }).expect(201);
    await request(app)
      .patch(`/usuarios/${creado.id}`)
      .send({ titular: 'No debe quedar', ciudadId: 'atlantida' })
      .expect(422);

    const { body } = await request(app).get(`/usuarios/${creado.id}`).expect(200);
    expect(body).toMatchObject({ titular: 'Original', ciudad: { id: 'cali' } });
  });

  it('rechaza un email que ya usa otro usuario', async () => {
    const email = emailDePrueba();
    await crear({ email }).expect(201);
    const { body: otro } = await crear().expect(201);
    await request(app).patch(`/usuarios/${otro.id}`).send({ email }).expect(409);
  });

  // Con un campo válido al lado: solo, el extra se quitaría y fallaría por cuerpo vacío.
  it('rechaza cuerpo vacío y campos protegidos', async () => {
    const { body: creado } = await crear().expect(201);
    await request(app).patch(`/usuarios/${creado.id}`).send({}).expect(400);
    await request(app).patch(`/usuarios/${creado.id}`).send({ titular: 'x', id: 'otro' }).expect(400);
    await request(app).patch(`/usuarios/${creado.id}`).send({ titular: 'x', creadoEn: '2000-01-01' }).expect(400);
  });

  it('responde 404 si no existe', async () => {
    await request(app).patch('/usuarios/no-existe').send({ titular: 'x' }).expect(404);
  });
});

describe('DELETE /usuarios/:id', () => {
  it('borra el usuario y sus relaciones', async () => {
    const { body: creado } = await crear().expect(201);
    const antes = await request(app).get('/usuarios/usr-04').expect(200);
    await escribir(
      `MATCH (a:Usuario {id: $id}), (b:Usuario {id: 'usr-04'})
       CREATE (a)-[:CONECTA_CON {desde: date()}]->(b)`,
      { id: creado.id },
    );

    await request(app).delete(`/usuarios/${creado.id}`).expect(204);

    await request(app).get(`/usuarios/${creado.id}`).expect(404);
    const despues = await request(app).get('/usuarios/usr-04').expect(200);
    expect(despues.body.totalConexiones).toBe(antes.body.totalConexiones);
  });

  it('responde 404 si no existe', async () => {
    await request(app).delete('/usuarios/no-existe').expect(404);
  });
});
