import { Azar } from './azar.js';
import {
  APELLIDOS,
  BLANDAS,
  CIUDADES,
  ESTADOS_POSTULACION,
  HABILIDADES,
  MODALIDADES,
  NIVELES_OFERTA,
  NOMBRES,
  PALABRAS_EMPRESA,
  ROLES,
  SECTORES,
} from './catalogos.js';

export interface Red {
  usuarios: { id: string; nombre: string; email: string; titular: string; aniosExperiencia: number; abiertoAOfertas: boolean; ciudadId: string }[];
  empresas: { id: string; nombre: string; sector: string; ciudadId: string }[];
  ofertas: { id: string; titulo: string; nivel: string; modalidad: string; estado: string; publicadaEn: string; empresaId: string; ciudadId: string }[];
  proyectos: { id: string; nombre: string; estado: string; empresaId: string | null }[];
  conexiones: { usuarioA: string; usuarioB: string; desde: string }[];
  tieneHabilidad: { usuarioId: string; habilidadId: string; nivel: number }[];
  trabajaEn: { usuarioId: string; empresaId: string; cargo: string; desde: string; actual: boolean }[];
  participaEn: { usuarioId: string; proyectoId: string; rol: string }[];
  requiere: { ofertaId: string; habilidadId: string; nivelMinimo: number; obligatoria: boolean }[];
  usa: { proyectoId: string; habilidadId: string }[];
  postulaA: { usuarioId: string; ofertaId: string; fecha: string; estado: string }[];
}

// Parámetros del modelo. Cambiarlos cambia la forma de la red: quedan aquí, a la vista.
const PROBABILIDAD_MISMA_CIUDAD = 0.85;
const PROBABILIDAD_AISLADO = 0.02;
const ENLACES_POR_PERSONA = { minimo: 1, maximo: 9 };
const PERSONAS_POR_EMPRESA = 50;
const PERSONAS_POR_PROYECTO = 20;
const PERSONAS_POR_OFERTA = 20;

const fecha = (azar: Azar, desdeAnio: number, hastaAnio: number) => {
  const anio = azar.entero(desdeAnio, hastaAnio);
  const mes = azar.entero(1, 12);
  const dia = azar.entero(1, 28);
  return `${anio}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
};

const ciudadAlAzar = (azar: Azar) => azar.ponderado(CIUDADES.map((c) => ({ valor: c.id, peso: c.peso })));

const nivelDeHabilidad = (azar: Azar) =>
  azar.ponderado([
    { valor: 1, peso: 10 },
    { valor: 2, peso: 20 },
    { valor: 3, peso: 35 },
    { valor: 4, peso: 25 },
    { valor: 5, peso: 10 },
  ]);

/**
 * Genera una red de `cantidad` personas. Mismos argumentos, misma red.
 *
 * Conexiones: cada persona nueva se une a entre 1 y 9 anteriores. Con 85 % de probabilidad
 * elige en su propia ciudad (comunidades, como un stochastic block model) y, dentro de la
 * comunidad, prefiere a quien ya tiene más contactos (preferential attachment, modelo de
 * Barabási-Albert). Así salen comunidades y unas pocas personas muy conectadas, como en una
 * red real. Un 2 % no se conecta con nadie.
 */
export function generarRed(cantidad: number, semilla = 2026): Red {
  const azar = new Azar(semilla);
  const red: Red = {
    usuarios: [],
    empresas: [],
    ofertas: [],
    proyectos: [],
    conexiones: [],
    tieneHabilidad: [],
    trabajaEn: [],
    participaEn: [],
    requiere: [],
    usa: [],
    postulaA: [],
  };

  // ---------- Personas y habilidades ----------
  const rolDe: (typeof ROLES)[number][] = [];
  const ciudadDe: string[] = [];
  for (let i = 0; i < cantidad; i++) {
    const rol = azar.ponderado(ROLES.map((r) => ({ valor: r, peso: r.peso })));
    const ciudadId = ciudadAlAzar(azar);
    const id = `u${i}`;
    rolDe.push(rol);
    ciudadDe.push(ciudadId);
    red.usuarios.push({
      id,
      nombre: `${azar.elegir(NOMBRES)} ${azar.elegir(APELLIDOS)}`,
      email: `${id}@bench.test`,
      titular: rol.titular,
      aniosExperiencia: Math.min(40, Math.floor(-Math.log(1 - azar.siguiente()) * 6)),
      abiertoAOfertas: azar.probabilidad(0.4),
      ciudadId,
    });

    const propias = new Set(azar.varios(rol.habilidades, azar.entero(3, Math.min(6, rol.habilidades.length))));
    if (azar.probabilidad(0.5)) propias.add(azar.elegir(BLANDAS));
    for (const habilidadId of propias) red.tieneHabilidad.push({ usuarioId: id, habilidadId, nivel: nivelDeHabilidad(azar) });
  }

  // ---------- Conexiones ----------
  // Por comunidad, una lista donde cada persona aparece una vez más por cada contacto que tiene:
  // elegir al azar de ella favorece a los más conectados sin recorrer a nadie.
  const urnas = new Map<string, number[]>(CIUDADES.map((c) => [c.id, []]));
  const pares = new Set<string>();
  for (let i = 0; i < cantidad; i++) {
    const propia = ciudadDe[i] as string;
    if (!azar.probabilidad(PROBABILIDAD_AISLADO)) {
      const enlaces = azar.entero(ENLACES_POR_PERSONA.minimo, ENLACES_POR_PERSONA.maximo);
      for (let k = 0; k < enlaces; k++) {
        const ciudad = azar.probabilidad(PROBABILIDAD_MISMA_CIUDAD) ? propia : ciudadAlAzar(azar);
        const urna = urnas.get(ciudad) as number[];
        if (urna.length === 0) continue;
        const otro = azar.elegir(urna);
        const clave = `${otro}-${i}`;
        if (otro === i || pares.has(clave)) continue;
        pares.add(clave);
        red.conexiones.push({ usuarioA: `u${otro}`, usuarioB: `u${i}`, desde: fecha(azar, 2015, 2026) });
        urna.push(otro);
        (urnas.get(propia) as number[]).push(i);
      }
    }
    (urnas.get(propia) as number[]).push(i);
  }

  // ---------- Empresas y empleos ----------
  const cantidadEmpresas = Math.max(8, Math.round(cantidad / PERSONAS_POR_EMPRESA));
  const empresasPorCiudad = new Map<string, string[]>(CIUDADES.map((c) => [c.id, []]));
  for (let e = 0; e < cantidadEmpresas; e++) {
    const id = `e${e}`;
    const ciudadId = ciudadAlAzar(azar);
    red.empresas.push({
      id,
      nombre: `${azar.elegir(PALABRAS_EMPRESA[0] ?? [])} ${azar.elegir(PALABRAS_EMPRESA[1] ?? [])}`,
      sector: azar.elegir(SECTORES),
      ciudadId,
    });
    empresasPorCiudad.get(ciudadId)?.push(id);
  }

  const empleados = new Map<string, string[]>();
  for (let i = 0; i < cantidad; i++) {
    const usuarioId = `u${i}`;
    const usadas = new Set<string>();
    const empleos = (azar.probabilidad(0.85) ? 1 : 0) + azar.entero(0, 2);
    for (let k = 0; k < empleos; k++) {
      const locales = empresasPorCiudad.get(ciudadDe[i] as string) ?? [];
      const empresaId =
        locales.length > 0 && azar.probabilidad(0.8) ? azar.elegir(locales) : (azar.elegir(red.empresas).id as string);
      if (usadas.has(empresaId)) continue;
      usadas.add(empresaId);
      const actual = k === 0 && empleos > 0 && azar.probabilidad(0.85);
      red.trabajaEn.push({
        usuarioId,
        empresaId,
        cargo: (rolDe[i] as (typeof ROLES)[number]).titular,
        desde: actual ? fecha(azar, 2019, 2026) : fecha(azar, 2010, 2020),
        actual,
      });
      empleados.set(empresaId, [...(empleados.get(empresaId) ?? []), usuarioId]);
    }
  }

  // ---------- Proyectos ----------
  const cantidadProyectos = Math.max(12, Math.round(cantidad / PERSONAS_POR_PROYECTO));
  for (let p = 0; p < cantidadProyectos; p++) {
    const id = `p${p}`;
    const empresaId = azar.probabilidad(0.7) ? azar.elegir(red.empresas).id : null;
    const rol = azar.ponderado(ROLES.map((r) => ({ valor: r, peso: r.peso })));
    red.proyectos.push({
      id,
      nombre: `Proyecto ${azar.elegir(PALABRAS_EMPRESA[0] ?? [])} ${p}`,
      estado: azar.probabilidad(0.75) ? 'en curso' : 'finalizado',
      empresaId,
    });
    for (const habilidadId of azar.varios(rol.habilidades, azar.entero(2, 5))) red.usa.push({ proyectoId: id, habilidadId });

    const candidatos = empresaId ? (empleados.get(empresaId) ?? []) : [];
    const miembros = new Set<string>();
    const cuantos = azar.entero(2, 8);
    for (let k = 0; k < cuantos * 2 && miembros.size < cuantos; k++) {
      miembros.add(candidatos.length > 0 && azar.probabilidad(0.8) ? azar.elegir(candidatos) : `u${azar.entero(0, cantidad - 1)}`);
    }
    for (const usuarioId of miembros) red.participaEn.push({ usuarioId, proyectoId: id, rol: azar.elegir(['Backend', 'Frontend', 'Datos', 'Diseño', 'Líder', 'QA']) });
  }

  // ---------- Ofertas y postulaciones ----------
  const cantidadOfertas = Math.max(15, Math.round(cantidad / PERSONAS_POR_OFERTA));
  const abiertas: string[] = [];
  for (let o = 0; o < cantidadOfertas; o++) {
    const id = `o${o}`;
    const empresa = azar.elegir(red.empresas);
    const rol = azar.ponderado(ROLES.map((r) => ({ valor: r, peso: r.peso })));
    const estado = azar.probabilidad(0.9) ? 'abierta' : 'cerrada';
    red.ofertas.push({
      id,
      titulo: `${rol.titular} ${o}`,
      nivel: azar.ponderado(NIVELES_OFERTA),
      modalidad: azar.ponderado(MODALIDADES),
      estado,
      publicadaEn: fecha(azar, 2026, 2026),
      empresaId: empresa.id,
      ciudadId: azar.probabilidad(0.8) ? empresa.ciudadId : ciudadAlAzar(azar),
    });
    if (estado === 'abierta') abiertas.push(id);
    for (const habilidadId of azar.varios(rol.habilidades, azar.entero(2, 5))) {
      red.requiere.push({ ofertaId: id, habilidadId, nivelMinimo: azar.entero(2, 4), obligatoria: azar.probabilidad(0.6) });
    }
  }

  for (let i = 0; i < cantidad && abiertas.length > 0; i++) {
    if (!azar.probabilidad(0.1)) continue;
    for (const ofertaId of azar.varios(abiertas, azar.entero(1, 3))) {
      red.postulaA.push({ usuarioId: `u${i}`, ofertaId, fecha: fecha(azar, 2026, 2026), estado: azar.elegir(ESTADOS_POSTULACION) });
    }
  }

  return red;
}

export const CATALOGO = {
  ciudades: CIUDADES.map(({ id, nombre, departamento }) => ({ id, nombre, departamento })),
  habilidades: HABILIDADES.map((h) => ({ ...h })),
};
