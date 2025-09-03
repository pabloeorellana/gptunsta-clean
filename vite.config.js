import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Vamos a ser lo más explícitos posible.
    // Leemos la variable de entorno que Vercel *debería* proporcionar en el entorno de build
    // y la asignamos a una variable global que nuestro código usará.
    'import.meta.env.VITE_API_URL': JSON.stringify(process.env.VITE_API_URL)
  }
})