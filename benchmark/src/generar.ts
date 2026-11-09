import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { aCsv, carpetaDatos, leerEscala } from './archivos.js';
import { CATALOGO, generarRed } from './modelo.js';
import { resumir } from './resumen.js';

// Los mismos CSV se cargan en Neo4j y en PostgreSQL: así ambas bases tienen exactamente los mismos datos.

const escala = leerEscala(process.argv[2]);
const carpeta = carpetaDatos(escala);
const inicio = performance.now();
const red = generarRed(escala);

const archivos: Record<string, string> = {
  ciudades: aCsv(CATALOGO.ciudades, ['id', 'nombre', 'departamento']),
  habilidades: aCsv(CATALOGO.habilidades, ['id', 'nombre', 'categoria']),
  usuarios: aCsv(red.usuarios, ['id', 'nombre', 'email', 'titular', 'aniosExperiencia', 'abiertoAOfertas', 'ciudadId']),
  empresas: aCsv(red.empresas, ['id', 'nombre', 'sector', 'ciudadId']),
  ofertas: aCsv(red.ofertas, ['id', 'titulo', 'nivel', 'modalidad', 'estado', 'publicadaEn', 'empresaId', 'ciudadId']),
  proyectos: aCsv(red.proyectos, ['id', 'nombre', 'estado', 'empresaId']),
  conexiones: aCsv(red.conexiones, ['usuarioA', 'usuarioB', 'desde']),
  tiene_habilidad: aCsv(red.tieneHabilidad, ['usuarioId', 'habilidadId', 'nivel']),
  trabaja_en: aCsv(red.trabajaEn, ['usuarioId', 'empresaId', 'cargo', 'desde', 'actual']),
  participa_en: aCsv(red.participaEn, ['usuarioId', 'proyectoId', 'rol']),
  requiere: aCsv(red.requiere, ['ofertaId', 'habilidadId', 'nivelMinimo', 'obligatoria']),
  usa: aCsv(red.usa, ['proyectoId', 'habilidadId']),
  postula_a: aCsv(red.postulaA, ['usuarioId', 'ofertaId', 'fecha', 'estado']),
};

await mkdir(carpeta, { recursive: true });
for (const [nombre, contenido] of Object.entries(archivos)) {
  await writeFile(join(carpeta, `${nombre}.csv`), contenido, 'utf8');
}
const resumen = resumir(red);
await writeFile(join(carpeta, 'resumen.json'), `${JSON.stringify(resumen, null, 2)}\n`, 'utf8');

console.log(`Red de ${escala} personas en ${Math.round(performance.now() - inicio)} ms → ${carpeta}`);
console.log(
  `${resumen.conexiones} conexiones, grado máximo ${resumen.gradoMaximo}, ${resumen.empresas} empresas, ` +
    `${resumen.ofertas} ofertas, ${resumen.proyectos} proyectos`,
);
