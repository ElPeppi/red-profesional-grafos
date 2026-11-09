import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { app } from '../src/app.js';
import { escribir, leer } from '../src/neo4j.js';

// Las pruebas corren contra el Neo4j local que tiene los datos semilla.
// Solo crean datos marcados y nunca modifican ni borran datos semilla: los usuarios llevan
// este dominio, y las empresas, ofertas y proyectos llevan esta marca en el nombre.
const DOMINIO = '@prueba.test';
const MARCA = '[prueba] ';

export const emailDePrueba = () => `${randomUUID()}${DOMINIO}`;

export const conMarca = (nombre: string) => `${MARCA}${nombre}`;

// toLower: si una regresión dejara pasar un email en mayúsculas, también debe limpiarse.
export async function limpiarDatosDePrueba() {
  await escribir('MATCH (u:Usuario) WHERE toLower(u.email) ENDS WITH $dominio DETACH DELETE u', { dominio: DOMINIO });
  await escribir('MATCH (n:Empresa|Proyecto) WHERE n.nombre STARTS WITH $marca DETACH DELETE n', { marca: MARCA });
  await escribir('MATCH (o:Oferta) WHERE o.titulo STARTS WITH $marca DETACH DELETE o', { marca: MARCA });
}

export const usuarioDePrueba = (extra: Record<string, unknown> = {}) => ({
  nombre: 'Persona de Prueba',
  email: emailDePrueba(),
  titular: 'Probador de Software',
  aniosExperiencia: 3,
  abiertoAOfertas: true,
  ciudadId: 'barranquilla',
  ...extra,
});

export const empresaDePrueba = (extra: Record<string, unknown> = {}) => ({
  nombre: conMarca('Empresa'),
  sector: 'Pruebas',
  ciudadId: 'barranquilla',
  ...extra,
});

const idCreado = async (ruta: string, datos: object): Promise<string> => {
  const res = await request(app).post(ruta).send(datos).expect(201);
  return res.body.id;
};

export const crearUsuario = (extra: Record<string, unknown> = {}) => idCreado('/usuarios', usuarioDePrueba(extra));

export const crearEmpresa = (extra: Record<string, unknown> = {}) => idCreado('/empresas', empresaDePrueba(extra));

export const crearProyecto = (extra: Record<string, unknown> = {}) =>
  idCreado('/proyectos', { nombre: conMarca('Proyecto'), ...extra });

export const ofertaDePrueba = (empresaId: string, extra: Record<string, unknown> = {}) => ({
  empresaId,
  ciudadId: 'barranquilla',
  titulo: conMarca('Oferta'),
  nivel: 'junior',
  modalidad: 'remoto',
  ...extra,
});

export const crearOferta = async (extra: Record<string, unknown> = {}) =>
  idCreado('/ofertas', ofertaDePrueba(await crearEmpresa(), extra));

export const ponerHabilidad = (usuario: string, habilidad: string, nivel = 3) =>
  request(app).put(`/usuarios/${usuario}/habilidades/${habilidad}`).send({ nivel }).expect(200);

export const pedirHabilidad = (oferta: string, habilidad: string, nivelMinimo = 3, obligatoria = true) =>
  request(app).put(`/ofertas/${oferta}/habilidades/${habilidad}`).send({ nivelMinimo, obligatoria }).expect(200);

export const ponerEmpleo = (usuario: string, empresa: string, actual = true) =>
  request(app).put(`/usuarios/${usuario}/empleos/${empresa}`).send({ cargo: 'Cargo', desde: '2024-01-01', actual }).expect(200);

export async function conectar(a: string, b: string) {
  await request(app).post(`/usuarios/${a}/solicitudes`).send({ destinoId: b }).expect(201);
  await request(app).post('/solicitudes/aceptar').send({ solicitanteId: a, destinoId: b }).expect(200);
}

/** Cuenta relaciones de un tipo entre dos nodos, directo en la base. */
export const contarRelaciones = async (tipo: string, origen: string, destino: string) => {
  const filas = await leer('MATCH ({id: $origen})-[r]->({id: $destino}) WHERE type(r) = $tipo RETURN count(r) AS total', {
    origen,
    destino,
    tipo,
  });
  return filas[0]?.total;
};

/** Tipo con que quedó guardada una propiedad de la relación entre dos nodos. */
export const tipoDePropiedad = async (propiedad: string, origen: string, destino: string) => {
  const filas = await leer('MATCH ({id: $origen})-[r]->({id: $destino}) RETURN valueType(r[$propiedad]) AS tipo', {
    origen,
    destino,
    propiedad,
  });
  return filas[0]?.tipo;
};

export const hoyEnColombia = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());

/** Una conexión nueva tarda más que una escritura: sin abrirlas antes, nada se solapa de verdad. */
export const abrirConexiones = () => Promise.all(Array.from({ length: 20 }, () => leer('RETURN 1')));
