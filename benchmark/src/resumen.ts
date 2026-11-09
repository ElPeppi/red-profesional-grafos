import type { Red } from './modelo.js';

/**
 * Lo que debe quedar en cada base tras la carga: conteos y algunas huellas que dependen del
 * contenido, no solo del tamaño. Si las dos bases dan esto mismo, tienen los mismos datos.
 */
export interface Resumen {
  usuarios: number;
  empresas: number;
  ofertas: number;
  proyectos: number;
  conexiones: number;
  tieneHabilidad: number;
  trabajaEn: number;
  participaEn: number;
  requiere: number;
  usa: number;
  postulaA: number;
  personasPorCiudad: Record<string, number>;
  gradoMaximo: number;
  sumaNiveles: number;
  ofertasAbiertas: number;
  proyectosComunitarios: number;
  empleosActuales: number;
}

export function resumir(red: Red): Resumen {
  const personasPorCiudad: Record<string, number> = {};
  for (const u of red.usuarios) personasPorCiudad[u.ciudadId] = (personasPorCiudad[u.ciudadId] ?? 0) + 1;

  const grado = new Map<string, number>();
  for (const { usuarioA, usuarioB } of red.conexiones) {
    grado.set(usuarioA, (grado.get(usuarioA) ?? 0) + 1);
    grado.set(usuarioB, (grado.get(usuarioB) ?? 0) + 1);
  }

  return {
    usuarios: red.usuarios.length,
    empresas: red.empresas.length,
    ofertas: red.ofertas.length,
    proyectos: red.proyectos.length,
    conexiones: red.conexiones.length,
    tieneHabilidad: red.tieneHabilidad.length,
    trabajaEn: red.trabajaEn.length,
    participaEn: red.participaEn.length,
    requiere: red.requiere.length,
    usa: red.usa.length,
    postulaA: red.postulaA.length,
    personasPorCiudad: ordenar(personasPorCiudad),
    gradoMaximo: Math.max(0, ...grado.values()),
    sumaNiveles: red.tieneHabilidad.reduce((suma, t) => suma + t.nivel, 0),
    ofertasAbiertas: red.ofertas.filter((o) => o.estado === 'abierta').length,
    proyectosComunitarios: red.proyectos.filter((p) => p.empresaId === null).length,
    empleosActuales: red.trabajaEn.filter((t) => t.actual).length,
  };
}

/** Mismo orden de claves en todos lados: así dos resúmenes se comparan como texto. */
export const ordenar = (objeto: Record<string, number>) =>
  Object.fromEntries(Object.entries(objeto).sort(([a], [b]) => a.localeCompare(b)));
