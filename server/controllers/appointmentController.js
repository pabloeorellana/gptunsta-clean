import { v4 as uuidv4 } from 'uuid';
import { DateTime } from 'luxon';
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
                    a.id, 
                    DATE_FORMAT(a.dateTime, '%Y-%m-%dT%H:%i:%SZ') AS start, 
                    DATE_FORMAT(DATE_ADD(a.dateTime, INTERVAL 30 MINUTE), '%Y-%m-%dT%H:%i:%SZ') AS end,
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
                    a.id, 
                    DATE_FORMAT(a.dateTime, '%Y-%m-%dT%H:%i:%SZ') AS start, 
                    DATE_FORMAT(DATE_ADD(a.dateTime, INTERVAL 30 MINUTE), '%Y-%m-%dT%H:%i:%SZ') AS end,
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
        const appointmentId = `appt_${uuidv4()}`;
        const appointmentDateTime = DateTime.fromISO(dateTime).toUTC().toFormat('yyyy-MM-dd HH:mm:ss');

        await pool.query(
            'INSERT INTO Appointments (id, dateTime, patientId, professionalUserId, reasonForVisit, status) VALUES (?, ?, ?, ?, ?, ?)',
            [appointmentId, appointmentDateTime, patientId, professionalUserId, reasonForVisit || null, 'SCHEDULED']
        );
        const [patientData] = await pool.query('SELECT fullName FROM Patients WHERE id = ?', [patientId]);
        const patientName = patientData.length > 0 ? patientData[0].fullName : 'Paciente';
        
        // Usamos Luxon para formatear la fecha para la notificación
        const notificationMessage = `Turno manual añadido para ${patientName} el ${DateTime.fromISO(dateTime).setZone('America/Argentina/Buenos_Aires').toFormat("dd/MM 'a las' HH:mm", { locale: 'es' })}.`;
        
        await pool.query(
            'INSERT INTO Notifications (userId, message, link) VALUES (?, ?, ?)',
            [professionalUserId, notificationMessage, `/profesional/dashboard/agenda?appointmentId=${appointmentId}`]
        );
        const [newAppointment] = await pool.query(`
            SELECT a.id, DATE_FORMAT(a.dateTime, '%Y-%m-%dT%H:%i:%SZ') AS start, DATE_FORMAT(DATE_ADD(a.dateTime, INTERVAL 30 MINUTE), '%Y-%m-%dT%H:%i:%SZ') AS end, p.fullName AS title, a.status, a.reasonForVisit, a.professionalNotes, a.patientId, p.dni AS patientDni, p.email AS patientEmail, p.phone AS patientPhone
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
        const newDateTimeUTC = DateTime.fromISO(newDateTime).toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
        let query = 'UPDATE Appointments SET dateTime = ? WHERE id = ?';
        const params = [newDateTimeUTC, appointmentId];
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
    const { professionalUserId, dateTime, dni, firstName, lastName, email, phone, reasonForVisit } = req.body;
    const fullName = `${firstName || ''} ${lastName || ''}`.trim();

     if (!professionalUserId || !dateTime || !dni || !fullName || !email) {
         return res.status(400).json({ message: 'Faltan datos requeridos para la reserva.' });
     }

     const connection = await pool.getConnection();
     try {
         await connection.beginTransaction();

         let [patients] = await connection.query('SELECT id FROM Patients WHERE dni = ?', [dni]);
         let patientId;

         if (patients.length > 0) {
             patientId = patients[0].id;
             await connection.query(
                 'UPDATE Patients SET fullName = ?, firstName = ?, lastName = ?, email = ?, phone = ? WHERE id = ?',
                 [fullName, firstName, lastName, email, phone || null, patientId]
             );
         } else {
             const [result] = await connection.query(
                 'INSERT INTO Patients (dni, fullName, firstName, lastName, email, phone) VALUES (?, ?, ?, ?, ?, ?)',
                 [dni, fullName, firstName, lastName, email, phone || null]
             );
             patientId = result.insertId;
         }

         const appointmentId = `appt_${uuidv4()}`;
         const appointmentDateTimeUTC = DateTime.fromISO(dateTime).toUTC().toFormat('yyyy-MM-dd HH:mm:ss');
         await connection.query(
             'INSERT INTO Appointments (id, professionalUserId, dateTime, patientId, reasonForVisit) VALUES (?, ?, ?, ?, ?)',
             [appointmentId, professionalUserId, appointmentDateTimeUTC, patientId, reasonForVisit || null]
         );
         const [professionalData] = await connection.query('SELECT fullName, email FROM Users WHERE id = ?', [professionalUserId]);

         if (professionalData.length > 0) {
            const professional = professionalData[0];
            
            await sendAppointmentConfirmationEmail(
                email,
                fullName,
                professional.fullName,
                DateTime.fromISO(dateTime).toJSDate(), 
                reasonForVisit
            );
         }

         const notificationMessage = `Nuevo turno de ${fullName} para el ${DateTime.fromISO(dateTime).setZone('America/Argentina/Buenos_Aires').toFormat("dd/MM 'a las' HH:mm", { locale: 'es' })}.`;
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