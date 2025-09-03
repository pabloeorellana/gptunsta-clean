import bcrypt from 'bcryptjs';
import pool from '../config/db.js';

export const getMyUserProfile = async (req, res) => {
    try {
        const [users] = await pool.query(
            'SELECT id, dni, email, fullName, phone, role, isActive, googleId, lastLogin, createdAt, updatedAt, profileImageUrl FROM Users WHERE id = ?',
            [req.user.userId]
        );
        if (users.length > 0) {
            res.json(users[0]);
        } else {
            res.status(404).json({ message: 'Usuario no encontrado' });
        }
    } catch (error) {
        console.error('Error en getMyUserProfile:', error);
        res.status(500).json({ message: 'Error del servidor al obtener perfil del usuario' });
    }
};

export const updateMyUserProfile = async (req, res) => {
    const { fullName, email, phone, specialty, description } = req.body;
    const userId = req.user.userId;
    if (!fullName || !email) {
        return res.status(400).json({ message: 'Nombre completo y email son requeridos.' });
    }
    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        const user = users[0];
        if (email !== user.email) {
            const [existingEmail] = await pool.query('SELECT id FROM Users WHERE email = ? AND id != ?', [email, userId]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ message: 'El correo electrónico ya está en uso por otro usuario.' });
            }
        }
        let profileImageUrl = user.profileImageUrl;
        if (req.file) {
            profileImageUrl = `/uploads/avatars/${req.file.filename}`;
        }
        await pool.query(
            'UPDATE Users SET fullName = ?, email = ?, phone = ?, profileImageUrl = ?, updatedAt = NOW() WHERE id = ?',
            [fullName, email, phone || null, profileImageUrl, userId]
        );
        if (user.role === 'PROFESSIONAL') {
            const [existingProfile] = await pool.query('SELECT userId FROM Professionals WHERE userId = ?', [userId]);
            if (existingProfile.length > 0) {
                await pool.query(
                    'UPDATE Professionals SET specialty = ?, description = ?, updatedAt = NOW() WHERE userId = ?',
                    [specialty || null, description || null, userId]
                );
            } else {
                await pool.query(
                    'INSERT INTO Professionals (userId, specialty, description) VALUES (?, ?, ?)',
                    [userId, specialty || null, description || null]
                );
            }
        }
        const [updatedUsers] = await pool.query(
            'SELECT id, dni, email, fullName, phone, role, profileImageUrl FROM Users WHERE id = ?',
            [userId]
        );
        res.json({
            message: "Perfil actualizado exitosamente",
            user: updatedUsers[0]
        });
    } catch (error) {
        console.error('Error en updateMyUserProfile:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar el perfil' });
    }
};

export const getMyProfessionalProfile = async (req, res) => {
    try {
        const [professionals] = await pool.query(
            'SELECT userId, specialty, description FROM Professionals WHERE userId = ?',
            [req.user.userId]
        );
        if (professionals.length > 0) {
            res.json(professionals[0]);
        } else {
            res.status(200).json({ specialty: '', description: '' });
        }
    } catch (error) {
        console.error('Error en getMyProfessionalProfile:', error);
        res.status(500).json({ message: 'Error del servidor al obtener perfil profesional' });
    }
};

export const changeMyPassword = async (req, res) => {
    const userId = req.user.userId;
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: 'Se requieren la contraseña actual y la nueva contraseña.' });
    }
    if (newPassword.length < 6) {
        return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
    }
    try {
        const [users] = await pool.query('SELECT passwordHash FROM Users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'La contraseña actual es incorrecta.' });
        }
        const salt = await bcrypt.genSalt(10);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);
        await pool.query('UPDATE Users SET passwordHash = ? WHERE id = ?', [newPasswordHash, userId]);
        res.json({ message: 'Contraseña actualizada exitosamente.' });
    } catch (error) {
        console.error('Error en changeMyPassword:', error);
        res.status(500).json({ message: 'Error del servidor al cambiar la contraseña.' });
    }
};