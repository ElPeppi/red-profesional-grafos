import express from 'express';
import { manejarErrores, rutaNoEncontrada } from './errores.js';
import { rutasAnalitica } from './rutas/analitica.js';
import { rutasCatalogos } from './rutas/catalogos.js';
import { rutasEmpresas } from './rutas/empresas.js';
import { rutasOfertas } from './rutas/ofertas.js';
import { rutasProyectos } from './rutas/proyectos.js';
import { rutasRecomendaciones } from './rutas/recomendaciones.js';
import { rutasRed } from './rutas/red.js';
import { rutasSalud } from './rutas/salud.js';
import { rutasUsuarios } from './rutas/usuarios.js';
import { rutasVinculos } from './rutas/vinculos.js';

// La app va separada de server.ts para que las pruebas la usen sin abrir un puerto.
export const app = express();

app.disable('x-powered-by');
app.use(express.json());

app.use('/salud', rutasSalud);
app.use('/usuarios', rutasUsuarios);
app.use('/usuarios', rutasVinculos);
app.use('/usuarios', rutasRecomendaciones);
app.use('/analitica', rutasAnalitica);
app.use('/empresas', rutasEmpresas);
app.use('/ofertas', rutasOfertas);
app.use('/proyectos', rutasProyectos);
app.use(rutasCatalogos);
app.use(rutasRed);

// El orden importa: estos dos van después de todas las rutas.
app.use(rutaNoEncontrada);
app.use(manejarErrores);
