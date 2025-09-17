// En: server/controllers/patientController.js

import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';

export const getPatients = async (req, res) => {
    const { userId, role } = req.user;
    try {
        let query;
        let params;
        
        if (role === 'ADMIN') {
            // --- SUBCONSULTA CORREGIDA PARA EL ADMIN ---
            const lastAppointmentSubquery = `
                LEFT JOIN (
                    SELECT 
                        patientId, 
                        MAX(dateTime) as lastAppointment,
                        -- Usamos SUBSTRING_INDEX con GROUP_CONCAT para obtener el ID del profesional
                        -- asociado a la CITA MÁS RECIENTE (ordenada por fecha descendente).
                        SUBSTRING_INDEX(GROUP_CONCAT(professionalUserId ORDER BY dateTime DESC), ',', 1) as lastProfessionalId
                    FROM Appointments
                    WHERE status = 'COMPLETED'
                    GROUP BY patientId
                ) AS la ON p.id = la.patientId
            `;
            // --- CONSULTA PRINCIPAL CORREGIDA PARA EL ADMIN ---
            query = `
                SELECT 
                    p.id, p.dni, p.fullName, p.firstName, p.lastName, p.email, p.phone, p.birthDate, p.isActive, 
                    COALESCE(creator.fullName, lastProf.fullName, 'Sistema/Público') AS createdByProfessionalName,
                    la.lastAppointment
                FROM Patients p
                LEFT JOIN Users creator ON p.createdByProfessionalId = creator.id
                ${lastAppointmentSubquery}
                LEFT JOIN Users lastProf ON la.lastProfessionalId = lastProf.id
                ORDER BY p.lastName ASC, p.firstName ASC
            `;
            params = [];
        } else {
            // La consulta para el profesional no necesita esta lógica compleja, así que la mantenemos simple.
            const professionalLastAppointmentSubquery = `
                LEFT JOIN (
                    SELECT patientId, MAX(dateTime) as lastAppointment
                    FROM Appointments
                    WHERE status = 'COMPLETED'
                    GROUP BY patientId
                ) AS la ON p.id = la.patientId
            `;
            query = `
                SELECT 
                    p.id, p.dni, p.fullName, p.firstName, p.lastName, p.email, p.phone, p.birthDate, p.isActive,
                    la.lastAppointment
                FROM Patients p
                ${professionalLastAppointmentSubquery}
                WHERE p.id IN (
                    SELECT id FROM Patients WHERE createdByProfessionalId = ?
                    UNION
                    SELECT patientId FROM Appointments WHERE professionalUserId = ?
                )
                ORDER BY p.lastName ASC, p.firstName ASC
            `;
            params = [userId, userId];
        }
        const [patients] = await pool.query(query, params);
        res.json(patients);
    } catch (error) {
        console.error('Error en getPatients:', error);
        res.status(500).json({ message: 'Error del servidor al obtener pacientes' });
    }
};

export const createPatient = async (req, res) => {
    const createdByProfessionalId = req.user?.userId;
    if (!createdByProfessionalId) {
        return res.status(401).json({ message: 'No autorizado: token inválido o sin ID de usuario.' });
    }
    const { dni, firstName, lastName, email, phone, birthDate } = req.body;
    if (!dni || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'DNI, nombre, apellido y email son requeridos.' });
    }
    try {
        const [existing] = await pool.query('SELECT id FROM Patients WHERE dni = ?', [dni]);
        if (existing.length > 0) {
            return res.status(400).json({ message: `El paciente con DNI ${dni} ya existe.` });
        }
        const fullName = `${firstName} ${lastName}`;
        const finalBirthDate = birthDate ? new Date(birthDate) : null;
        const [result] = await pool.query(
            'INSERT INTO Patients (dni, fullName, firstName, lastName, email, phone, birthDate, createdByProfessionalId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [dni, fullName, firstName, lastName, email, phone || null, finalBirthDate, createdByProfessionalId]
        );
        const newPatientId = result.insertId;
        const [newPatient] = await pool.query('SELECT * FROM Patients WHERE id = ?', [newPatientId]);
        res.status(201).json(newPatient[0]);
    } catch (error) {
        console.error('Error en createPatient:', error);
        res.status(500).json({ message: 'Error del servidor al crear el paciente' });
    }
};

export const updatePatient = async (req, res) => {
    const { id: patientId } = req.params;
    const { dni, firstName, lastName, email, phone, birthDate } = req.body;
    if (!dni || !firstName || !lastName || !email) {
        return res.status(400).json({ message: 'DNI, nombre, apellido y email son requeridos.' });
    }
    try {
        const [existingDni] = await pool.query(
            'SELECT id FROM Patients WHERE dni = ? AND id != ?',
            [dni, patientId]
        );
        if (existingDni.length > 0) {
            return res.status(400).json({ message: `El DNI ${dni} ya pertenece a otro paciente.` });
        }
        const fullName = `${firstName} ${lastName}`;
        const finalBirthDate = birthDate ? new Date(birthDate) : null;
        const [result] = await pool.query(
            'UPDATE Patients SET dni = ?, fullName = ?, firstName = ?, lastName = ?, email = ?, phone = ?, birthDate = ?, updatedAt = NOW() WHERE id = ?',
            [dni, fullName, firstName, lastName, email, phone || null, finalBirthDate, patientId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado.' });
        }
        const [updatedPatient] = await pool.query('SELECT * FROM Patients WHERE id = ?', [patientId]);
        res.json(updatedPatient[0]);
    } catch (error) {
        console.error('Error en updatePatient:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar el paciente' });
    }
};

export const lookupPatientByDni = async (req, res) => {
    const { dni } = req.query;
    if (!dni) {
        return res.status(400).json({ message: "Se requiere un DNI." });
    }
    try {
        const [patients] = await pool.query(
            'SELECT id, dni, firstName, lastName, fullName, email, phone, birthDate FROM Patients WHERE dni = ?',
            [dni.trim()]
        );
        if (patients.length > 0) {
            res.json(patients[0]);
        } else {
            res.status(404).json({ message: "Paciente no encontrado." });
        }
    } catch (error) {
        console.error('Error en lookupPatientByDni:', error);
        res.status(500).json({ message: "Error del servidor al buscar paciente." });
    }
};

export const deletePatient = async (req, res) => {
    const { id: patientId } = req.params;
    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();
        await connection.execute('DELETE FROM ClinicalRecords WHERE patientId = ?', [patientId]);
        await connection.execute('DELETE FROM Appointments WHERE patientId = ?', [patientId]);
        const [patientResult] = await connection.execute('DELETE FROM Patients WHERE id = ?', [patientId]);
        if (patientResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Paciente no encontrado.' });
        }
        await connection.commit();
        res.json({ message: 'Paciente y datos asociados eliminados exitosamente.' });
    } catch (error) {
        if (connection) await connection.rollback();
        console.error('Error en deletePatient:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar el paciente y sus datos asociados.' });
    } finally {
        if (connection) connection.release();
    }
};

export const togglePatientStatus = async (req, res) => {
    const { id: patientId } = req.params;
    try {
        const [patients] = await pool.query('SELECT isActive FROM Patients WHERE id = ?', [patientId]);
        if (patients.length === 0) {
            return res.status(404).json({ message: 'Paciente no encontrado.' });
        }
        const currentStatus = patients[0].isActive;
        const newStatus = !currentStatus;
        await pool.query('UPDATE Patients SET isActive = ? WHERE id = ?', [newStatus, patientId]);
        const action = newStatus ? 'reactivado' : 'archivado';
        res.json({ message: `Paciente ${action} exitosamente.` });
    } catch (error) {
        console.error('Error en togglePatientStatus:', error);
        res.status(500).json({ message: 'Error del servidor al cambiar el estado del paciente.' });
    }
};