let apiUrl = 'http://localhost:3001'; // URL por defecto para desarrollo

// Vite establece esta variable a 'true' automáticamente durante 'npm run build'
if (import.meta.env.PROD) {
  apiUrl = 'http://3.22.227.67'; // URL para producción
}

// Usamos 'export const' para que coincida con cómo lo importas en otros archivos.
export const API_BASE_URL = apiUrl;