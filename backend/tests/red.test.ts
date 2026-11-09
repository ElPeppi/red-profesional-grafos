import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { consulta } from '../src/consultas.js';
import { cerrarDriver, escribir, leer } from '../src/neo4j.js';
import { abrirConexiones, crearUsuario, hoyEnColombia, limpiarDatosDePrueba } from './ayudas.js';

const dosUsuarios = async () => [await crearUsuario(), await crearUsuario()] as const;

const solicitar = (solicitanteId: string, destinoId: string) =>
  request(app).post(`/usuarios/${solicitanteId}/solicitudes`).send({ destinoId });

const aceptar = (solicitanteId: string, destinoId: string) =>
  request(app).post('/solicitudes/aceptar').send({ solicitanteId, destinoId });

const rechazar = (solicitanteId: string, destinoId: string) =>
  request(app).post('/solicitudes/rechazar').send({ solicitanteId, destinoId });

/** Cuenta relaciones entre dos usuarios en cualquier sentido, directo en la base. */
const contar = async (tipo: 'CONECTA_CON' | 'SOLICITA_CONEXION', a: string, b: string) => {
  const filas = await leer(
    `MATCH (:Usuario {id: $a})-[r]-(:Usuario {id: $b}) WHERE type(r) = $tipo RETURN count(r) AS total`,
    { a, b, tipo },
  );
  return filas[0]?.total;
};

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('POST /usuarios/:id/solicitudes', () => {
  it('crea la solicitud con la fecha de Colombia', async () => {
    const [a, b] = await dosUsuarios();
    const res = await solicitar(a, b).expect(201);

    expect(res.body).toEqual({ solicitanteId: a, destinoId: b, fecha: hoyEnColombia() });
    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(1);
  });

  it('no permite enviarse una solicitud a sí mismo', async () => {
    const a = await crearUsuario();
    const res = await solicitar(a, a).expect(422);
    expect(res.body.codigo).toBe('SOLICITUD_INVALIDA');
    expect(await contar('SOLICITA_CONEXION', a, a)).toBe(0);
  });

  it('responde 404 si alguno de los dos no existe', async () => {
    const a = await crearUsuario();
    await solicitar(a, 'no-existe').expect(404);
    await solicitar('no-existe', a).expect(404);
  });

  it('no repite una solicitud pendiente', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    const res = await solicitar(a, b).expect(409);
    expect(res.body.codigo).toBe('SOLICITUD_PENDIENTE');
    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(1);
  });

  it('avisa si la otra persona ya envió una solicitud', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    const res = await solicitar(b, a).expect(409);
    expect(res.body.codigo).toBe('SOLICITUD_INVERSA');
    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(1);
  });

  it('rechaza si ya están conectados, en cualquier sentido', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await aceptar(a, b).expect(200);

    expect((await solicitar(a, b).expect(409)).body.codigo).toBe('YA_CONECTADOS');
    expect((await solicitar(b, a).expect(409)).body.codigo).toBe('YA_CONECTADOS');
  });

  it('exige el usuario destino y rechaza campos desconocidos', async () => {
    const a = await crearUsuario();
    await request(app).post(`/usuarios/${a}/solicitudes`).send({}).expect(400);
    await request(app).post(`/usuarios/${a}/solicitudes`).send({ destinoId: 'x', fecha: '2000-01-01' }).expect(400);
  });

  it('veinte clics simultáneos dejan una sola solicitud', async () => {
    const [a, b] = await dosUsuarios();
    const respuestas = await Promise.all(Array.from({ length: 20 }, () => solicitar(a, b)));

    expect(respuestas.every((r) => r.status === 201 || r.status === 409)).toBe(true);
    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(1);
  });

  // Va directo a la consulta porque por la API la revisión previa suele frenar a los
  // demás antes de llegar al MERGE, y la prueba pasaría por suerte de tiempos.
  it('MERGE no duplica aunque las escrituras se solapen en la base', async () => {
    const [a, b] = await dosUsuarios();
    await abrirConexiones();

    await Promise.all(
      Array.from({ length: 20 }, () => escribir(consulta('crearSolicitud'), { solicitanteId: a, destinoId: b })),
    );

    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(1);
  });
});

describe('POST /solicitudes/aceptar', () => {
  it('cambia la solicitud por una conexión con fecha de Colombia', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    const res = await aceptar(a, b).expect(200);

    expect(res.body).toEqual({ solicitanteId: a, destinoId: b, desde: hoyEnColombia() });
    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(0);
    expect(await contar('CONECTA_CON', a, b)).toBe(1);
  });

  it('la conexión se ve desde los dos usuarios y en el perfil', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await aceptar(a, b).expect(200);

    const desdeA = await request(app).get(`/usuarios/${a}/conexiones`).expect(200);
    const desdeB = await request(app).get(`/usuarios/${b}/conexiones`).expect(200);
    expect(desdeA.body.datos.map((u: { id: string }) => u.id)).toEqual([b]);
    expect(desdeB.body.datos.map((u: { id: string }) => u.id)).toEqual([a]);

    const perfil = await request(app).get(`/usuarios/${b}`).expect(200);
    expect(perfil.body.totalConexiones).toBe(1);
  });

  it('solo acepta en el sentido de la solicitud', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    const res = await aceptar(b, a).expect(404);

    expect(res.body.codigo).toBe('SOLICITUD_NO_ENCONTRADA');
    expect(await contar('CONECTA_CON', a, b)).toBe(0);
  });

  it('responde 404 si no hay solicitud, y no conecta', async () => {
    const [a, b] = await dosUsuarios();
    await aceptar(a, b).expect(404);
    expect(await contar('CONECTA_CON', a, b)).toBe(0);
  });

  it('aceptar dos veces no duplica la conexión', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await aceptar(a, b).expect(200);
    await aceptar(a, b).expect(404);
    expect(await contar('CONECTA_CON', a, b)).toBe(1);
  });

  it('veinte aceptaciones simultáneas dejan una sola conexión', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await abrirConexiones();
    const respuestas = await Promise.all(Array.from({ length: 20 }, () => aceptar(a, b)));

    expect(respuestas.every((r) => r.status === 200 || r.status === 404)).toBe(true);
    expect(respuestas.some((r) => r.status === 200)).toBe(true);
    expect(await contar('CONECTA_CON', a, b)).toBe(1);
    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(0);
  });

  it('borra también una solicitud cruzada en sentido contrario', async () => {
    const [a, b] = await dosUsuarios();
    await escribir(
      `MATCH (a:Usuario {id: $a}), (b:Usuario {id: $b})
       CREATE (a)-[:SOLICITA_CONEXION {fecha: date()}]->(b),
              (b)-[:SOLICITA_CONEXION {fecha: date()}]->(a)`,
      { a, b },
    );

    await aceptar(a, b).expect(200);

    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(0);
    expect(await contar('CONECTA_CON', a, b)).toBe(1);
  });

  it('no sobrescribe la fecha de una conexión que ya existía', async () => {
    const [a, b] = await dosUsuarios();
    await escribir(
      `MATCH (a:Usuario {id: $a}), (b:Usuario {id: $b})
       CREATE (b)-[:CONECTA_CON {desde: date('2020-01-15')}]->(a),
              (a)-[:SOLICITA_CONEXION {fecha: date()}]->(b)`,
      { a, b },
    );

    const res = await aceptar(a, b).expect(200);

    expect(res.body.desde).toBe('2020-01-15');
    expect(await contar('CONECTA_CON', a, b)).toBe(1);
  });

  it('exige los dos usuarios', async () => {
    await request(app).post('/solicitudes/aceptar').send({ solicitanteId: 'a' }).expect(400);
  });
});

describe('POST /solicitudes/rechazar', () => {
  it('borra la solicitud sin crear conexión', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await rechazar(a, b).expect(204);

    expect(await contar('SOLICITA_CONEXION', a, b)).toBe(0);
    expect(await contar('CONECTA_CON', a, b)).toBe(0);
  });

  it('después de rechazar se puede volver a solicitar', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await rechazar(a, b).expect(204);
    await solicitar(a, b).expect(201);
  });

  it('responde 404 si no hay solicitud', async () => {
    const [a, b] = await dosUsuarios();
    const res = await rechazar(a, b).expect(404);
    expect(res.body.codigo).toBe('SOLICITUD_NO_ENCONTRADA');
  });
});

describe('GET /usuarios/:id/solicitudes', () => {
  it('separa recibidas y enviadas', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);

    const deA = await request(app).get(`/usuarios/${a}/solicitudes`).expect(200);
    const deB = await request(app).get(`/usuarios/${b}/solicitudes`).expect(200);

    expect(deA.body.recibidas).toEqual([]);
    expect(deA.body.enviadas.map((u: { id: string }) => u.id)).toEqual([b]);
    expect(deB.body.enviadas).toEqual([]);
    expect(deB.body.recibidas.map((u: { id: string }) => u.id)).toEqual([a]);
  });

  it('lee los datos semilla, la más reciente primero', async () => {
    const res = await request(app).get('/usuarios/usr-11/solicitudes').expect(200);
    expect(res.body.recibidas).toMatchObject([
      { id: 'usr-33', fecha: '2026-11-03' },
      { id: 'usr-19', fecha: '2026-11-01' },
    ]);
  });

  it('responde 404 si el usuario no existe', async () => {
    await request(app).get('/usuarios/no-existe/solicitudes').expect(404);
  });
});

describe('GET /usuarios/:id/relacion/:otroId', () => {
  const relacion = (id: string, otroId: string) => request(app).get(`/usuarios/${id}/relacion/${otroId}`);
  const NINGUNA = { conectados: false, solicitudEnviada: false, solicitudRecibida: false };

  it('sin nada entre los dos, todo es falso', async () => {
    const [a, b] = await dosUsuarios();

    expect((await relacion(a, b).expect(200)).body).toEqual(NINGUNA);
  });

  it('distingue quién envió la solicitud', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);

    expect((await relacion(a, b).expect(200)).body).toEqual({ ...NINGUNA, solicitudEnviada: true });
    expect((await relacion(b, a).expect(200)).body).toEqual({ ...NINGUNA, solicitudRecibida: true });
  });

  it('tras aceptar quedan conectados en ambos sentidos, sin solicitud pendiente', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await aceptar(a, b).expect(200);

    expect((await relacion(a, b).expect(200)).body).toEqual({ ...NINGUNA, conectados: true });
    expect((await relacion(b, a).expect(200)).body).toEqual({ ...NINGUNA, conectados: true });
  });

  it('tras rechazar no queda nada', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await rechazar(a, b).expect(204);

    expect((await relacion(b, a).expect(200)).body).toEqual(NINGUNA);
  });

  it('con alguno inexistente responde 404', async () => {
    const [a] = await dosUsuarios();

    expect((await relacion(a, 'no-existe').expect(404)).body.codigo).toBe('USUARIO_NO_ENCONTRADO');
    await relacion('no-existe', a).expect(404);
  });

  it('consigo mismo responde 422', async () => {
    const [a] = await dosUsuarios();

    expect((await relacion(a, a).expect(422)).body.codigo).toBe('MISMA_PERSONA');
  });
});

describe('GET /usuarios/:id/conexiones', () => {
  it('lista y pagina los contactos de un usuario semilla', async () => {
    const res = await request(app).get('/usuarios/usr-02/conexiones?limite=3').expect(200);

    expect(res.body).toMatchObject({ total: 8, pagina: 1, limite: 3 });
    expect(res.body.datos).toHaveLength(3);
    expect(res.body.datos[0]).toEqual({
      id: expect.any(String),
      nombre: expect.any(String),
      titular: expect.any(String),
      ciudad: expect.any(String),
      desde: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    const siguiente = await request(app).get('/usuarios/usr-02/conexiones?limite=3&pagina=3').expect(200);
    expect(siguiente.body.datos).toHaveLength(2);
  });

  it('un usuario sin red da lista vacía, no error', async () => {
    const res = await request(app).get('/usuarios/usr-39/conexiones').expect(200);
    expect(res.body).toMatchObject({ total: 0, datos: [] });
  });

  it('una conexión guardada al revés también aparece', async () => {
    const [a, b] = await dosUsuarios();
    await escribir(
      `MATCH (a:Usuario {id: $a}), (b:Usuario {id: $b}) CREATE (b)-[:CONECTA_CON {desde: date()}]->(a)`,
      { a, b },
    );
    const res = await request(app).get(`/usuarios/${a}/conexiones`).expect(200);
    expect(res.body.total).toBe(1);
  });

  it('responde 404 si el usuario no existe', async () => {
    await request(app).get('/usuarios/no-existe/conexiones').expect(404);
  });

  it('valida la paginación', async () => {
    await request(app).get('/usuarios/usr-01/conexiones?limite=0').expect(400);
  });
});

describe('Al borrar un usuario', () => {
  it('desaparecen sus solicitudes pendientes', async () => {
    const [a, b] = await dosUsuarios();
    await solicitar(a, b).expect(201);
    await request(app).delete(`/usuarios/${a}`).expect(204);

    const res = await request(app).get(`/usuarios/${b}/solicitudes`).expect(200);
    expect(res.body.recibidas).toEqual([]);
  });
});
