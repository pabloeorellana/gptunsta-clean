import pool from '../config/db.js';

export const getNotifications = async (req, res) => {
    const userId = req.user.userId;
    try {
        const [notifications] = await pool.query(
            'SELECT id, message, link, isRead, createdAt FROM Notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT 5',
            [userId]
        );
        const [unreadResult] = await pool.query(
            'SELECT COUNT(*) as unreadCount FROM Notifications WHERE userId = ? AND isRead = FALSE',
            [userId]
        );
        res.json({
            notifications,
            unreadCount: unreadResult[0].unreadCount
        });
    } catch (error) {
        res.status(500).json({ message: "Error al obtener notificaciones." });
    }
};

export const markNotificationsAsRead = async (req, res) => {
    const userId = req.user.userId;
    try {
        await pool.query('UPDATE Notifications SET isRead = TRUE WHERE userId = ? AND isRead = FALSE', [userId]);
        res.json({ message: "Notificaciones marcadas como leídas." });
    } catch (error) {
        res.status(500).json({ message: "Error al marcar notificaciones como leídas." });
    }
};