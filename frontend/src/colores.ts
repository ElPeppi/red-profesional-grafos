// El canvas no lee variables CSS: estos valores repiten los de index.css.
export const TINTA = '#1d2129';
export const TARJETA = '#fffdf9';
export const BORDE = '#d8d2c4';
export const BORDE_TENUE = '#eeeae0';
export const GRIS = '#a8a396';
export const AZUL = '#2a78d6';

// Se comparan todos los pares, no solo los vecinos, porque en el grafo cualquier color
// puede quedar junto a otro: 5 colores pasan el piso de color normal (15.6) y de daltonismo
// (6.9). Ese margen exige una segunda señal: por eso cada nodo lleva también su número.
const COMUNIDADES = [
  { fondo: AZUL, texto: '#ffffff' },
  { fondo: '#1baf7a', texto: TINTA },
  { fondo: '#eda100', texto: TINTA },
  { fondo: '#008300', texto: '#ffffff' },
  { fondo: '#e34948', texto: '#ffffff' },
];

/** Una sexta comunidad no inventa color: va en gris y conserva su número. */
export const colorDeComunidad = (indice: number | undefined) =>
  (indice === undefined ? undefined : COMUNIDADES[indice]) ?? { fondo: GRIS, texto: TINTA };

export const COLOR_POR_TIPO = {
  Usuario: AZUL,
  Empresa: '#eda100',
  Oferta: '#e34948',
} as const;
