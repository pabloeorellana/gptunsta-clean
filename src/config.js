let apiUrl;
if (import.meta.env.PROD) {
  apiUrl = '/api';
} else {
  apiUrl = 'http://localhost:3001';
}
export const API_BASE_URL = apiUrl;