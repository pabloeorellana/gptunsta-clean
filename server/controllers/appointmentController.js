import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { sendAppointmentConfirmationEmail } from '../utils/emailService.js';
import pool from '../config/db.js';

export const getAppointments = async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }
    try {
        let query;
        let params;
        if (role === 'ADMIN') {
            query = `
                SELECT
                    a.id, a.dateTime AS start, DATE_ADD(a.dateTime, INTERVAL 30 MINUTE) AS end,
                    p.fullName AS title, a.status, a.reasonForVisit, a.professionalNotes,
                    a.patientId, p.dni AS patientDni, p.email AS patientEmail, p.phone AS patientPhone,
                    u.fullName AS professionalName
                FROM Appointments a
                JOIN Patients p ON a.patientId = p.id
                JOIN Users u ON a.professionalUserId = u.id
                WHERE a.dateTime BETWEEN ? AND ?
            `;
            params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];
        } else {
            query = `
                SELECT
                    a.id, a.dateTime AS start, DATE_ADD(a.dateTime, INTERVAL 30 MINUTE) AS end,
                    p.fullName AS title, a.status, a.reasonForVisit, a.professionalNotes,
                    a.patientId, p.dni AS patientDni, p.email AS patientEmail, p.phone AS patientPhone
                FROM Appointments a
                JOIN Patients p ON a.patientId = p.id
                WHERE a.professionalUserId = ? AND a.dateTime BETWEEN ? AND ?
            `;
            params = [userId, `${startDate} 00:00:00`, `${endDate} 23:59:59`];
        }
        const [appointments] = await pool.query(query, params);
        res.json(appointments);
    } catch (error) {
        console.error('Error en getAppointments:', error);
        res.status(500).json({ message: 'Error del servidor al obtener turnos' });
    }
};

export const createManualAppointment = async (req, res) => {
    const professionalUserId = req.user.userId;
    const { patientId, dateTime, reasonForVisit } = req.body;
    if (!patientId || !dateTime) {
        return res.status(400).json({ message: 'Se requiere paciente y fecha/hora.' });
    }
    try {
        const appointmentId = `appt_${new Date().getTime()}`;

        await pool.query(
            'INSERT INTO Appointments (id, dateTime, patientId, professionalUserId, reasonForVisit, status) VALUES (?, ?, ?, ?, ?, ?)',
            [appointmentId, new Date(dateTime), patientId, professionalUserId, reasonForVisit || null, 'SCHEDULED']
        );
        const [patientData] = await pool.query('SELECT fullName FROM Patients WHERE id = ?', [patientId]);
        const patientName = patientData.length > 0 ? patientData[0].fullName : 'Paciente';
        const notificationMessage = `Turno manual añadido para ${patientName} el ${format(new Date(dateTime), "dd/MM 'a las' HH:mm")}.`;
        await pool.query(
            'INSERT INTO Notifications (userId, message, link) VALUES (?, ?, ?)',
            [professionalUserId, notificationMessage, `/profesional/dashboard/agenda?appointmentId=${appointmentId}`]
        );
        const [newAppointment] = await pool.query(`
            SELECT a.id, a.dateTime AS start, DATE_ADD(a.dateTime, INTERVAL 30 MINUTE) AS end, p.fullName AS title, a.status, a.reasonForVisit, a.professionalNotes, a.patientId, p.dni AS patientDni, p.email AS patientEmail, p.phone AS patientPhone
            FROM Appointments a JOIN Patients p ON a.patientId = p.id WHERE a.id = ?`,
            [appointmentId]
        );
        res.status(201).json(newAppointment[0]);
    } catch (error) {
        console.error('Error en createManualAppointment:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un turno en este horario.' });
        }
        res.status(500).json({ message: 'Error del servidor al crear el turno' });
    }
};

export const updateAppointmentStatus = async (req, res) => {
    const { id: appointmentId } = req.params;
    const { status } = req.body;
    const { userId, role } = req.user;
    if (!status) {
        return res.status(400).json({ message: 'Se requiere un estado.' });
    }
    try {
        let query = 'UPDATE Appointments SET status = ? WHERE id = ?';
        const params = [status, appointmentId];
        if (role !== 'ADMIN') {
            query += ' AND professionalUserId = ?';
            params.push(userId);
        }
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Estado del turno actualizado.' });
    } catch (error) {
        console.error('Error en updateAppointmentStatus:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar estado.' });
    }
};

export const reprogramAppointment = async (req, res) => {
    const { id: appointmentId } = req.params;
    const { newDateTime } = req.body;
    const { userId, role } = req.user;
    if (!newDateTime) {
        return res.status(400).json({ message: 'Se requiere una nueva fecha y hora.' });
    }
    try {
        let query = 'UPDATE Appointments SET dateTime = ? WHERE id = ?';
        const params = [new Date(newDateTime), appointmentId];
        if (role !== 'ADMIN') {
            query += ' AND professionalUserId = ?';
            params.push(userId);
        }
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Turno reprogramado.' });
    } catch (error) {
        console.error('Error en reprogramAppointment:', error);
         if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un turno en el nuevo horario seleccionado.' });
        }
        res.status(500).json({ message: 'Error del servidor al reprogramar.' });
    }
};

export const deleteAppointment = async (req, res) => {
    const { id: appointmentId } = req.params;
    const { userId, role } = req.user;
    try {
        let query = 'DELETE FROM Appointments WHERE id = ?';
        const params = [appointmentId];
        if (role !== 'ADMIN') {
            query += ' AND professionalUserId = ?';
            params.push(userId);
        }
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Turno eliminado.' });
    } catch (error) {
        console.error('Error en deleteAppointment:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar turno.' });
    }
};

export const updateProfessionalNotes = async (req, res) => {
    const { id: appointmentId } = req.params;
    const { professionalNotes } = req.body;
    const { userId, role } = req.user;
    try {
        let query = 'UPDATE Appointments SET professionalNotes = ? WHERE id = ?';
        const params = [professionalNotes, appointmentId];
        if (role !== 'ADMIN') {
            query += ' AND professionalUserId = ?';
            params.push(userId);
        }
        const [result] = await pool.query(query, params);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Turno no encontrado o no autorizado.' });
        }
        res.json({ message: 'Notas guardadas.' });
    } catch(error) {
        console.error('Error en updateProfessionalNotes:', error);
        res.status(500).json({ message: 'Error del servidor al guardar notas.' });
    }
};

export const createPublicAppointment = async (req, res) => {
     // --- CÓDIGO CORREGIDO ---
     // Desestructuramos los datos del paciente directamente desde req.body,
     // en lugar de buscar un objeto 'patientDetails'.
     const { professionalUserId, dateTime, dni, fullName, email, phone, reasonForVisit } = req.body;

     if (!professionalUserId || !dateTime || !dni || !fullName || !email) {
         return res.status(400).json({ message: 'Faltan datos requeridos para la reserva.' });
     }

     const connection = await pool.getConnection();
     try {
         await connection.beginTransaction();

         // Paso 1: Buscar o crear el paciente
         let [patients] = await connection.query('SELECT id FROM Patients WHERE dni = ?', [dni]);
         let patientId;

         if (patients.length > 0) {
             // El paciente ya existe, usamos su ID
             patientId = patients[0].id;
             // Opcional: Actualizar sus datos de contacto
             await connection.query(
                 'UPDATE Patients SET fullName = ?, email = ?, phone = ? WHERE id = ?',
                 [fullName, email, phone || null, patientId]
             );
         } else {
             // El paciente es nuevo, lo creamos
             const [result] = await connection.query(
                 'INSERT INTO Patients (dni, fullName, email, phone) VALUES (?, ?, ?, ?)',
                 [dni, fullName, email, phone || null]
             );
             patientId = result.insertId;
         }

         // Paso 2: Crear el turno
         const appointmentId = `appt_${uuidv4()}`;
         await connection.query(
             'INSERT INTO Appointments (id, professionalUserId, dateTime, patientId, reasonForVisit) VALUES (?, ?, ?, ?, ?)',
             [appointmentId, professionalUserId, dateTime, patientId, reasonForVisit || null]
         );

         // (Opcional) Paso 3: Crear una notificación para el profesional
         const notificationMessage = `Nuevo turno de ${fullName} para el ${format(new Date(dateTime), 'dd/MM \'a las\' HH:mm', { locale: es })}.`;
         const notificationLink = `/profesional/dashboard/agenda?appointmentId=${appointmentId}`;
         await connection.query(
             'INSERT INTO Notifications (userId, message, link) VALUES (?, ?, ?)',
             [professionalUserId, notificationMessage, notificationLink]
         );

         await connection.commit();

         res.status(201).json({
             message: 'Turno confirmado exitosamente.',
             appointmentId: appointmentId
         });

     } catch (error) {
         await connection.rollback();
         console.error("Error en createPublicAppointment:", error);
         if (error.code === 'ER_DUP_ENTRY') {
             return res.status(409).json({ message: 'El horario seleccionado ya no está disponible. Por favor, elija otro.' });
         }
         res.status(500).json({ message: 'Error interno del servidor al confirmar el turno.' });
     } finally {
         connection.release();
     }
 };