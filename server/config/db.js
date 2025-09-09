import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Mantenemos la lógica de detección para logging, está perfecta.
if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL encontrada. Usando para la conexión.");
} else {
    console.log("DATABASE_URL no encontrada. Usando DB_HOST, DB_USER, etc.");
}

// --- CÓDIGO CORREGIDO Y FINAL ---
// 1. Definimos las opciones base que son comunes a ambos entornos.
const baseOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    // La clave: le decimos a mysql2 que trabaje siempre en UTC.
    timezone: 'Z' 
};

// 2. Creamos el objeto de configuración final fusionando las opciones.
const connectionOptions = process.env.DATABASE_URL
    // Para producción, fusionamos las opciones base con la URI.
    ? { ...baseOptions, uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    // Para local, fusionamos las opciones base con los detalles de host, usuario, etc.
    : {
        ...baseOptions,
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

let pool;
try {
    pool = mysql.createPool(connectionOptions);
    console.log(`Pool de conexiones a la base de datos creado exitosamente.`);
} catch (error) {
    console.error('Error al crear el pool de conexiones a la base de datos:', error);
    process.exit(1);
}

export default pool;