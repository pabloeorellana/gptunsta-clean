import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

if (process.env.DATABASE_URL) {
    console.log("DATABASE_URL encontrada. Usando para la conexión.");
} else {
    console.log("DATABASE_URL no encontrada. Usando DB_HOST, DB_USER, etc.");
}

const baseOptions = {
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    timezone: 'Z' 
};

const connectionOptions = process.env.DATABASE_URL
    ? { ...baseOptions, uri: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
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