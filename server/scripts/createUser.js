import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

const createUser = async (dni, email, password, fullName, role, specialty = null) => {
    let connection;
    try {
        connection = await pool.getConnection(); 
        console.log("Conectado a la DB para crear usuario...");

        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(password, saltRounds);
        const userId = uuidv4();

        const [existingUsers] = await connection.execute(
            'SELECT dni, email FROM Users WHERE dni = ? OR email = ?',
            [dni, email]
        );

        if (existingUsers.length > 0) {
            existingUsers.forEach(user => {
                if (user.dni === dni) console.error(`Error: El DNI ${dni} ya está registrado.`);
                if (user.email === email) console.error(`Error: El email ${email} ya está registrado.`);
            });
            return;
        }

        await connection.beginTransaction();

        await connection.execute(
            'INSERT INTO Users (id, dni, email, passwordHash, fullName, role, isActive) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [userId, dni, email, passwordHash, fullName, role, true]
        );
        console.log(`Usuario ${fullName} (ID: ${userId}) creado con rol ${role}.`);

        if (role === 'PROFESSIONAL') {
            await connection.execute(
                'INSERT INTO Professionals (userId, specialty) VALUES (?, ?)',
                [userId, specialty || 'General']
            );
            console.log(`Datos profesionales para ${fullName} creados.`);
        }

        await connection.commit();
        console.log('Usuario guardado exitosamente.');

    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error creando usuario:', error);
    } finally {
        if (connection) connection.release();
        console.log("Conexión a la DB liberada.");
    }
};

const main = async () => {
    // Solo ejecutar el script desde la línea de comandos
    if (process.argv[1] && process.argv[1].includes('createUser.js')) {
        const userToCreate = {
            dni: 'administrador',
            email: 'administrador@nutrismart.com',
            password: 'AdminPassword123!',
            fullName: 'Administrador del Sistema',
            role: 'ADMIN',
            specialty: null
        };

        console.log(`\nIniciando creación de usuario con rol: ${userToCreate.role}`);
        await createUser(
            userToCreate.dni,
            userToCreate.email,
            userToCreate.password,
            userToCreate.fullName,
            userToCreate.role,
            userToCreate.specialty
        );
        await pool.end();
    }
};

main();