import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';

// --- IMPORTACIÓN DE RUTAS ---
// Todas las rutas deben estar activas para que la API funcione.
import userRoutes from './routes/userRoutes.js';
import availabilityRoutes from './routes/availabilityRoutes.js';
import patientRoutes from './routes/patientRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import clinicalRecordRoutes from './routes/clinicalRecordRoutes.js';
import statisticsRoutes from './routes/statisticsRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import authRoutes from './routes/authRoutes.js';
import catalogRoutes from './routes/catalogRoutes.js';
//import settingsRoutes from './routes/settingsRoutes.js';

const app = express();
const PORT = process.env.PORT || 3001; // Declarado una sola vez al principio
const JWT_SECRET = process.env.JWT_SECRET;

// Configuración de __dirname para ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Verificación de variables de entorno críticas al inicio
if (!JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET no está definida en .env");
    process.exit(1);
}

// Configuración de CORS
const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.error(`CORS Error: Origen no permitido: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

console.log("Orígenes permitidos por CORS:", allowedOrigins);

// Middlewares globales
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/*
// --- CÓDIGO ANTIGUO (COMENTADO PARA ANÁLISIS) ---
// Esta línea usaba una ruta relativa (path.join(__dirname, 'uploads')).
// __dirname apunta a /app/server, por lo que la ruta final era /app/server/uploads.
// Queremos que apunte a la raíz /app/uploads para que coincida con el Volume Mount.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
*/

// --- CÓDIGO NUEVO Y MEJORADO ---
// Usamos una ruta ABSOLUTA para servir los archivos estáticos.
// Esto asegura que Express sirva los archivos desde la misma carpeta
// que hemos hecho persistente con el Volume Mount (/app/uploads).
app.use('/uploads', express.static('/app/uploads'));


// --- Montaje de Rutas de la API con Prefijos ----
// Todas las rutas de tu API deben estar activas para que el backend funcione.
app.use('/api/public', publicRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/clinical-records', clinicalRecordRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/catalogs', catalogRoutes);
//app.use('/api/settings', settingsRoutes);

// Ruta de "health check" para verificar que el servidor está vivo
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Servidor NutriSmart está funcionando!' });
});

/*
// --- SERVIR EL FRONTEND EN PRODUCCIÓN ---
// Este bloque se comenta porque en el enfoque dividido, 
// el frontend será servido por una app de Coolify separada.
if (process.env.NODE_ENV === 'production') {
    // 1. Sirve la carpeta 'dist' que contiene tu frontend construido
    const buildPath = path.join(__dirname, '../dist');
    app.use(express.static(buildPath));

    // 2. Para cualquier otra petición, devuelve el index.html
    app.get('*', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
}
*/

// --- Manejador de Errores Global ---
// Este debe ser el ÚLTIMO app.use()
app.use((err, req, res, next) => {
    console.error('--- ERROR GLOBAL CAPTURADO ---');
    console.error('Mensaje:', err.message);
    console.error('Stack:', err.stack);
    console.error('-----------------------------');
    
    if (res.headersSent) {
      return next(err);
    }
    
    res.status(500).json({
        message: err.message || 'Ha ocurrido un error inesperado en el servidor.',
        stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack,
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor backend GPTUNSTA corriendo en el puerto: ${PORT}`);
});