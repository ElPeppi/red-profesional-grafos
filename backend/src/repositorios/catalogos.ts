import { consulta } from '../consultas.js';
import { leer } from '../neo4j.js';

const CIUDADES = consulta('listarCiudades');
const HABILIDADES = consulta('listarHabilidades');

export async function listarCiudades() {
  const filas = await leer(CIUDADES);
  return { datos: filas.map((f) => f.ciudad) };
}

export async function listarHabilidades() {
  const filas = await leer(HABILIDADES);
  return { datos: filas.map((f) => f.habilidad) };
}
