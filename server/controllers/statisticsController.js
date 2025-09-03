import pool from '../config/db.js';

export const getStatistics = async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, professionalId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }
    let baseWhereClause = 'WHERE a.dateTime BETWEEN ? AND ?';
    let params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];
    if (role === 'ADMIN') {
        if (professionalId) {
            baseWhereClause += ' AND a.professionalUserId = ?';
            params.push(professionalId);
        }
    } else {
        baseWhereClause += ' AND a.professionalUserId = ?';
        params.push(userId);
    }
    try {
        const [totalAppointmentsResult, uniquePatientsResult, appointmentsByStatusResult] = await Promise.all([
            pool.query(
                `SELECT COUNT(*) as count FROM Appointments a ${baseWhereClause} AND a.status NOT LIKE ?`,
                [...params, 'CANCELED%']
            ),
            pool.query(
                `SELECT COUNT(DISTINCT a.patientId) as count FROM Appointments a ${baseWhereClause} AND a.status NOT LIKE ?`,
                [...params, 'CANCELED%']
            ),
            pool.query(
                `SELECT a.status, COUNT(*) as count FROM Appointments a ${baseWhereClause} GROUP BY a.status`,
                params
            )
        ]);
        const totalAppointments = totalAppointmentsResult[0][0].count || 0;
        const uniquePatients = uniquePatientsResult[0][0].count || 0;
        const appointmentsByStatusRaw = appointmentsByStatusResult[0];
        const statusDetails = {
            COMPLETED: { label: 'Completados' },
            SCHEDULED: { label: 'Programados' },
            CONFIRMED: { label: 'Confirmados' },
            CANCELED_PROFESSIONAL: { label: 'Cancelado (Prof.)' },
            CANCELED_PATIENT: { label: 'Cancelado (Pac.)' },
            NO_SHOW: { label: 'No Asistió' },
        };
        const appointmentsByStatus = appointmentsByStatusRaw.map(item => ({
            name: statusDetails[item.status]?.label || item.status,
            value: item.count,
            key: item.status
        }));
        res.json({
            totalAppointments,
            uniquePatients,
            appointmentsByStatus
        });
    } catch (error) {
        console.error('Error en getStatistics:', error);
        res.status(500).json({ message: 'Error del servidor al obtener estadísticas' });
    }
};

export const getAppointmentsListForReport = async (req, res) => {
    const { userId, role } = req.user;
    const { startDate, endDate, professionalId } = req.query;
    if (!startDate || !endDate) {
        return res.status(400).json({ message: 'Se requieren fechas de inicio y fin.' });
    }
    let baseWhereClause = 'WHERE a.dateTime BETWEEN ? AND ?';
    let params = [`${startDate} 00:00:00`, `${endDate} 23:59:59`];
    if (role === 'ADMIN') {
        if (professionalId) {
            baseWhereClause += ' AND a.professionalUserId = ?';
            params.push(professionalId);
        }
    } else {
        baseWhereClause += ' AND a.professionalUserId = ?';
        params.push(userId);
    }
    try {
        const query = `
            SELECT 
                a.dateTime,
                p.fullName AS patientName,
                a.status,
                cr.pathology,
                a.reasonForVisit,
                u.fullName as professionalName
            FROM Appointments a
            JOIN Patients p ON a.patientId = p.id
            JOIN Users u ON a.professionalUserId = u.id
            LEFT JOIN ClinicalRecords cr ON a.id = cr.appointmentId
            ${baseWhereClause}
            ORDER BY a.dateTime DESC
        `;
        const [appointmentsList] = await pool.query(query, params);
        res.json(appointmentsList);
    } catch (error) {
        console.error('Error en getAppointmentsListForReport:', error);
        res.status(500).json({ message: 'Error del servidor al obtener la lista de turnos' });
    }
};