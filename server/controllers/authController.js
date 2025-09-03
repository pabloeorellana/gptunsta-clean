import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '../utils/emailService.js';

const JWT_SECRET = process.env.JWT_SECRET;

export const loginUser = async (req, res) => {
    const { dni, password } = req.body;
    if (!dni || !password) {
        return res.status(400).json({ message: 'DNI y contraseña son requeridos.' });
    }
    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE dni = ? AND isActive = TRUE', [dni]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }
        const payload = {
            userId: user.id,
            dni: user.dni,
            role: user.role,
            fullName: user.fullName
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
        await pool.query('UPDATE Users SET lastLogin = NOW() WHERE id = ?', [user.id]);
        res.json({
            token,
            user: {
                id: user.id,
                dni: user.dni,
                fullName: user.fullName,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('BACKEND LOGIN: Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor durante el login.' });
    }
};

export const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: 'Por favor, ingrese un correo electrónico.' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM Users WHERE email = ? AND isActive = TRUE', [email]);

        if (users.length === 0) {
            // ¡Importante por seguridad! No revelamos si el email existe o no.
            // Siempre enviamos una respuesta exitosa.
            return res.json({ message: 'Si existe una cuenta con ese correo, se ha enviado un enlace de restablecimiento.' });
        }
        
        const user = users[0];

        // Generar un token aleatorio y seguro
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Hashear el token antes de guardarlo en la DB
        const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
        
        // Establecer la fecha de expiración (ej. 1 hora)
        const expirationDate = new Date(Date.now() + 3600000); // 1 hora en milisegundos

        await pool.query(
            'UPDATE Users SET resetPasswordToken = ?, resetPasswordExpires = ? WHERE id = ?',
            [hashedToken, expirationDate, user.id]
        );

        // Enviar el email con el token SIN hashear
        await sendPasswordResetEmail(user.email, resetToken);

        res.json({ message: 'Si existe una cuenta con ese correo, se ha enviado un enlace de restablecimiento.' });

    } catch (error) {
        console.error('Error en forgotPassword:', error);
        // En caso de un error grave, podemos devolver un error de servidor,
        // pero evitamos dar detalles sobre el usuario.
        res.status(500).json({ message: 'Error del servidor al procesar la solicitud.' });
    }
};

// --- AÑADIR NUEVA FUNCIÓN: resetPassword ---
export const resetPassword = async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
        return res.status(400).json({ message: 'La contraseña es requerida y debe tener al menos 6 caracteres.' });
    }

    // Hashear el token recibido para compararlo con el de la DB
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const [users] = await pool.query(
            'SELECT * FROM Users WHERE resetPasswordToken = ? AND resetPasswordExpires > NOW()',
            [hashedToken]
        );

        if (users.length === 0) {
            return res.status(400).json({ message: 'El token es inválido o ha expirado.' });
        }

        const user = users[0];

        // Hashear la nueva contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Actualizar la contraseña e invalidar el token
        await pool.query(
            'UPDATE Users SET passwordHash = ?, resetPasswordToken = NULL, resetPasswordExpires = NULL WHERE id = ?',
            [passwordHash, user.id]
        );

        res.json({ message: 'Contraseña actualizada exitosamente. Ahora puede iniciar sesión.' });

    } catch (error) {
        console.error('Error en resetPassword:', error);
        res.status(500).json({ message: 'Error del servidor al restablecer la contraseña.' });
    }
};