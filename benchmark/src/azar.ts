/**
 * Generador de números pseudoaleatorios con semilla (mulberry32). Math.random no acepta
 * semilla: con ella, misma semilla da exactamente la misma red en cada corrida y en cada
 * máquina. Sin eso no se puede repetir un experimento.
 */
export class Azar {
  private estado: number;

  constructor(semilla: number) {
    this.estado = semilla >>> 0;
  }

  /** Número en [0, 1). */
  siguiente(): number {
    this.estado = (this.estado + 0x6d2b79f5) >>> 0;
    let t = this.estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Entero en [minimo, maximo], ambos incluidos. */
  entero(minimo: number, maximo: number): number {
    return minimo + Math.floor(this.siguiente() * (maximo - minimo + 1));
  }

  probabilidad(p: number): boolean {
    return this.siguiente() < p;
  }

  elegir<T>(lista: readonly T[]): T {
    const elegido = lista[Math.floor(this.siguiente() * lista.length)];
    if (elegido === undefined) throw new Error('No se puede elegir de una lista vacía');
    return elegido;
  }

  /** Elige según pesos: un peso 3 sale el triple de veces que un peso 1. */
  ponderado<T>(opciones: readonly { valor: T; peso: number }[]): T {
    const total = opciones.reduce((suma, o) => suma + o.peso, 0);
    let punto = this.siguiente() * total;
    for (const opcion of opciones) {
      punto -= opcion.peso;
      if (punto < 0) return opcion.valor;
    }
    const ultima = opciones.at(-1);
    if (!ultima) throw new Error('No hay opciones');
    return ultima.valor;
  }

  /** k elementos distintos de la lista (o todos, si hay menos). */
  varios<T>(lista: readonly T[], k: number): T[] {
    const copia = [...lista];
    for (let i = copia.length - 1; i > 0; i--) {
      const j = Math.floor(this.siguiente() * (i + 1));
      [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
    }
    return copia.slice(0, k);
  }
}
