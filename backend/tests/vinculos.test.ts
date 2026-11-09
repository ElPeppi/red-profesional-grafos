import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { consulta } from '../src/consultas.js';
import { cerrarDriver, entero, escribir } from '../src/neo4j.js';
import {
  abrirConexiones,
  contarRelaciones,
  crearEmpresa,
  crearProyecto,
  crearUsuario,
  limpiarDatosDePrueba,
  tipoDePropiedad,
} from './ayudas.js';

const perfil = async (id: string) => (await request(app).get(`/usuarios/${id}`).expect(200)).body;

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('Habilidades del usuario', () => {
  const poner = (usuario: string, habilidad: string, cuerpo: object) =>
    request(app).put(`/usuarios/${usuario}/habilidades/${habilidad}`).send(cuerpo);

  it('agrega la habilidad y aparece en el perfil', async () => {
    const id = await crearUsuario();
    const res = await poner(id, 'react', { nivel: 4 }).expect(200);

    expect(res.body).toEqual({ id: 'react', nombre: 'React', categoria: 'Frontend', nivel: 4 });
    expect((await perfil(id)).habilidades).toEqual([res.body]);
  });

  it('repetir actualiza el nivel sin duplicar', async () => {
    const id = await crearUsuario();
    await poner(id, 'react', { nivel: 2 }).expect(200);
    const res = await poner(id, 'react', { nivel: 5 }).expect(200);

    expect(res.body.nivel).toBe(5);
    expect(await contarRelaciones('TIENE_HABILIDAD', id, 'react')).toBe(1);
  });

  it('guarda el nivel como entero', async () => {
    const id = await crearUsuario();
    await poner(id, 'react', { nivel: 3 }).expect(200);
    expect(await tipoDePropiedad('nivel', id, 'react')).toBe('INTEGER NOT NULL');
  });

  it.each([0, 6, 2.5, '3', null])('rechaza el nivel %s', async (nivel) => {
    const id = await crearUsuario();
    await poner(id, 'react', { nivel }).expect(400);
    expect(await contarRelaciones('TIENE_HABILIDAD', id, 'react')).toBe(0);
  });

  it('exige el nivel y rechaza campos desconocidos', async () => {
    const id = await crearUsuario();
    await poner(id, 'react', {}).expect(400);
    await poner(id, 'react', { nivel: 3, extra: true }).expect(400);
  });

  it('responde 404 si falta el usuario o la habilidad', async () => {
    const id = await crearUsuario();
    expect((await poner('no-existe', 'react', { nivel: 3 }).expect(404)).body.codigo).toBe('NO_ENCONTRADO');
    expect((await poner(id, 'no-existe', { nivel: 3 }).expect(404)).body.mensaje).toBe(
      'No existe el usuario o la habilidad',
    );
  });

  it('MERGE no duplica aunque las escrituras se solapen en la base', async () => {
    const id = await crearUsuario();
    await abrirConexiones();
    const parametros = { usuarioId: id, habilidadId: 'react', nivel: entero(3) };

    await Promise.all(Array.from({ length: 20 }, () => escribir(consulta('ponerHabilidadUsuario'), parametros)));

    expect(await contarRelaciones('TIENE_HABILIDAD', id, 'react')).toBe(1);
  });

  it('quita la habilidad; la segunda vez responde 404', async () => {
    const id = await crearUsuario();
    await poner(id, 'react', { nivel: 3 }).expect(200);

    await request(app).delete(`/usuarios/${id}/habilidades/react`).expect(204);
    expect(await contarRelaciones('TIENE_HABILIDAD', id, 'react')).toBe(0);

    const res = await request(app).delete(`/usuarios/${id}/habilidades/react`).expect(404);
    expect(res.body).toEqual({ codigo: 'VINCULO_NO_ENCONTRADO', mensaje: 'El usuario no tiene esa habilidad' });
  });
});

describe('Empleos del usuario', () => {
  const empleo = { cargo: 'Ingeniera de Pruebas', desde: '2024-03-15', actual: true };
  const poner = (usuario: string, empresa: string, cuerpo: object) =>
    request(app).put(`/usuarios/${usuario}/empleos/${empresa}`).send(cuerpo);

  it('agrega el empleo y aparece en el perfil', async () => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    const res = await poner(id, empresa, empleo).expect(200);

    expect(res.body).toEqual({ id: empresa, nombre: expect.any(String), ...empleo });
    expect((await perfil(id)).empleos).toEqual([res.body]);
  });

  it('guarda desde como fecha y no como texto', async () => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    await poner(id, empresa, empleo).expect(200);
    expect(await tipoDePropiedad('desde', id, empresa)).toBe('DATE NOT NULL');
  });

  it('asume empleo actual si no se indica', async () => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    const res = await poner(id, empresa, { cargo: 'Analista', desde: '2024-01-01' }).expect(200);
    expect(res.body.actual).toBe(true);
  });

  it('repetir actualiza el empleo sin duplicar', async () => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    await poner(id, empresa, empleo).expect(200);
    const res = await poner(id, empresa, { ...empleo, cargo: 'Líder', actual: false }).expect(200);

    expect(res.body).toMatchObject({ cargo: 'Líder', actual: false });
    expect(await contarRelaciones('TRABAJA_EN', id, empresa)).toBe(1);
  });

  it.each(['2023-02-30', '15/03/2024', 'ayer'])('rechaza la fecha %s', async (desde) => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    await poner(id, empresa, { ...empleo, desde }).expect(400);
  });

  it('exige cargo con contenido', async () => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    await poner(id, empresa, { ...empleo, cargo: '   ' }).expect(400);
  });

  it('responde 404 si falta el usuario o la empresa', async () => {
    const id = await crearUsuario();
    await poner('no-existe', 'emp-01', empleo).expect(404);
    await poner(id, 'no-existe', empleo).expect(404);
  });

  it('quita el empleo; la segunda vez responde 404', async () => {
    const [id, empresa] = [await crearUsuario(), await crearEmpresa()];
    await poner(id, empresa, empleo).expect(200);

    await request(app).delete(`/usuarios/${id}/empleos/${empresa}`).expect(204);
    expect(await contarRelaciones('TRABAJA_EN', id, empresa)).toBe(0);
    await request(app).delete(`/usuarios/${id}/empleos/${empresa}`).expect(404);
  });
});

describe('Proyectos del usuario', () => {
  const poner = (usuario: string, proyecto: string, cuerpo: object) =>
    request(app).put(`/usuarios/${usuario}/proyectos/${proyecto}`).send(cuerpo);

  it('agrega la participación y aparece en el perfil', async () => {
    const [id, proyecto] = [await crearUsuario(), await crearProyecto()];
    const res = await poner(id, proyecto, { rol: 'Backend' }).expect(200);

    expect(res.body).toEqual({ id: proyecto, nombre: expect.any(String), estado: 'en curso', rol: 'Backend' });
    expect((await perfil(id)).proyectos).toEqual([res.body]);
  });

  it('repetir cambia el rol sin duplicar', async () => {
    const [id, proyecto] = [await crearUsuario(), await crearProyecto()];
    await poner(id, proyecto, { rol: 'Backend' }).expect(200);
    const res = await poner(id, proyecto, { rol: 'Líder' }).expect(200);

    expect(res.body.rol).toBe('Líder');
    expect(await contarRelaciones('PARTICIPA_EN', id, proyecto)).toBe(1);
  });

  it('exige el rol', async () => {
    const [id, proyecto] = [await crearUsuario(), await crearProyecto()];
    await poner(id, proyecto, {}).expect(400);
  });

  it('responde 404 si falta el usuario o el proyecto', async () => {
    const id = await crearUsuario();
    await poner('no-existe', 'prj-01', { rol: 'x' }).expect(404);
    await poner(id, 'no-existe', { rol: 'x' }).expect(404);
  });

  it('quita la participación; la segunda vez responde 404', async () => {
    const [id, proyecto] = [await crearUsuario(), await crearProyecto()];
    await poner(id, proyecto, { rol: 'Backend' }).expect(200);

    await request(app).delete(`/usuarios/${id}/proyectos/${proyecto}`).expect(204);
    expect(await contarRelaciones('PARTICIPA_EN', id, proyecto)).toBe(0);
    await request(app).delete(`/usuarios/${id}/proyectos/${proyecto}`).expect(404);
  });
});
