import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Escritura sobre la red. Una conexión o una habilidad nueva cambia recomendaciones, comunidades,
 * caminos y perfiles a la vez: en vez de listar qué invalidar, se marca todo como viejo y se vuelve
 * a pedir solo lo que está en pantalla. También tras un error: un 409 suele decir que la pantalla
 * mostraba un estado que ya cambió. Los catálogos quedan fuera: la API no los modifica.
 *
 * esperar: false para borrados. Quien borra se va de la página: no tiene por qué esperar a que se
 * vuelva a pedir lo que está en pantalla, que incluye el registro recién borrado (un 404 seguro).
 * No cambia lo que se ve, solo cuánto tarda en salir.
 */
export function useEscritura<V, R>(escribir: (variables: V) => Promise<R>, { esperar = true } = {}) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: escribir,
    onSettled: () => {
      const refresco = cliente.invalidateQueries({ predicate: (consulta) => consulta.queryKey[0] !== 'catalogo' });
      return esperar ? refresco : undefined;
    },
  });
}
