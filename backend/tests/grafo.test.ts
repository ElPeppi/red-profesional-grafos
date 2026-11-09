import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app.js';
import { consulta } from '../src/consultas.js';
import { cerrarDriver, leer } from '../src/neo4j.js';
import {
  conMarca,
  crearEmpresa,
  crearOferta,
  crearProyecto,
  crearUsuario,
  limpiarDatosDePrueba,
  ofertaDePrueba,
  pedirHabilidad,
  ponerHabilidad,
} from './ayudas.js';

// Las operaciones escriben y las consultas de 03 leen: si una propiedad o relación
// se llamara distinto en cada lado, las pruebas de cada parte pasarían igual.
// Aquí se comprueba que lo creado por la API llega a las recomendaciones.

const ids = (filas: Record<string, unknown>[]) => filas.map((f) => f.id);

const candidatos = (ofertaId: string) => leer(consulta('candidatosParaOferta'), { ofertaId });
const empleos = (usuarioId: string) => leer(consulta('recomendarEmpleos'), { usuarioId });
const colaboradores = (proyectoId: string) => leer(consulta('recomendarColaboradores'), { proyectoId });
const contactos = (usuarioId: string) => leer(consulta('recomendarContactos'), { usuarioId });

beforeAll(limpiarDatosDePrueba);
afterAll(async () => {
  await limpiarDatosDePrueba();
  await cerrarDriver();
});

describe('Lo que crea la API llega a las recomendaciones', () => {
  it('una oferta nueva encuentra candidato, con su explicación', async () => {
    const [oferta, usuario] = [await crearOferta(), await crearUsuario()];
    await pedirHabilidad(oferta, 'go', 5, true);
    await pedirHabilidad(oferta, 'terraform', 5, false);
    await ponerHabilidad(usuario, 'go', 5);

    const fila = (await candidatos(oferta)).find((c) => c.id === usuario);

    expect(fila).toMatchObject({ cumple: ['Go'], faltan: ['Terraform'], faltanObligatorias: [] });
  });

  it('una habilidad por debajo del mínimo no cuenta', async () => {
    const [oferta, usuario] = [await crearOferta(), await crearUsuario()];
    await pedirHabilidad(oferta, 'go', 5, true);
    await ponerHabilidad(usuario, 'go', 4);

    expect(ids(await candidatos(oferta))).not.toContain(usuario);
    expect(ids(await empleos(usuario))).not.toContain(oferta);
  });

  it('la oferta se recomienda al usuario hasta que se postula', async () => {
    const [oferta, usuario] = [await crearOferta(), await crearUsuario()];
    await pedirHabilidad(oferta, 'go', 3, true);
    await ponerHabilidad(usuario, 'go', 3);
    expect(ids(await empleos(usuario))).toContain(oferta);

    await request(app).post(`/ofertas/${oferta}/postulaciones`).send({ usuarioId: usuario }).expect(201);

    expect(ids(await empleos(usuario))).not.toContain(oferta);
    expect(ids(await candidatos(oferta))).not.toContain(usuario);
  });

  it('una oferta cerrada deja de recomendarse', async () => {
    const [oferta, usuario] = [await crearOferta(), await crearUsuario()];
    await pedirHabilidad(oferta, 'go', 3, true);
    await ponerHabilidad(usuario, 'go', 3);

    await request(app).patch(`/ofertas/${oferta}`).send({ estado: 'cerrada' }).expect(200);

    expect(ids(await empleos(usuario))).not.toContain(oferta);
    expect(await candidatos(oferta)).toEqual([]);
  });

  it('quien ya trabaja en la empresa no sale como candidato ni le llega la oferta', async () => {
    const empresaId = await crearEmpresa();
    const creada = await request(app).post('/ofertas').send(ofertaDePrueba(empresaId)).expect(201);
    const usuario = await crearUsuario();
    await pedirHabilidad(creada.body.id, 'go', 3, true);
    await ponerHabilidad(usuario, 'go', 3);
    await request(app)
      .put(`/usuarios/${usuario}/empleos/${empresaId}`)
      .send({ cargo: 'Dentro', desde: '2024-01-01' })
      .expect(200);

    expect(ids(await candidatos(creada.body.id))).not.toContain(usuario);
    expect(ids(await empleos(usuario))).not.toContain(creada.body.id);
  });

  it('un proyecto nuevo encuentra colaboradores, y deja de sugerir a sus miembros', async () => {
    const [proyecto, usuario] = [await crearProyecto(), await crearUsuario()];
    await request(app).put(`/proyectos/${proyecto}/habilidades/go`).expect(200);
    await ponerHabilidad(usuario, 'go', 3);
    expect(ids(await colaboradores(proyecto))).toContain(usuario);

    await request(app).put(`/usuarios/${usuario}/proyectos/${proyecto}`).send({ rol: 'x' }).expect(200);

    expect(ids(await colaboradores(proyecto))).not.toContain(usuario);
  });

  it('compartir empresa sugiere el contacto, con la empresa como razón', async () => {
    const empresa = await crearEmpresa();
    const [a, b] = [await crearUsuario({ ciudadId: 'monteria' }), await crearUsuario({ ciudadId: 'cali' })];
    for (const usuario of [a, b]) {
      await request(app)
        .put(`/usuarios/${usuario}/empleos/${empresa}`)
        .send({ cargo: 'Colega', desde: '2024-01-01' })
        .expect(200);
    }

    const fila = (await contactos(a)).find((c) => c.id === b);

    expect(fila).toMatchObject({ empresasEnComun: [conMarca('Empresa')] });
  });
});
