import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// El navegador solo habla con Vite, así que ve un único origen y el backend no necesita
// CORS. El backend no conoce el prefijo /api: sirve para separar lo que va a la API de
// las rutas de React, y por eso se quita antes de reenviar.
const proxy = {
  '/api': {
    target: 'http://localhost:3000',
    rewrite: (ruta: string) => ruta.replace(/^\/api/, ''),
  },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy },
  preview: { port: 4173, strictPort: true, proxy },
});
