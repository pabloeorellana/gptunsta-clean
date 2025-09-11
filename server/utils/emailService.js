import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; 
import crypto from 'crypto';
import { DateTime } from 'luxon'; // <-- CAMBIO: Importamos Luxon

dotenv.config();

const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT == 465, 
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
    },
});

export const sendAppointmentConfirmationEmail = async (patientEmail, patientName, professionalName, dateTime, reasonForVisit) => {
    if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD || !process.env.SENDER_EMAIL) {
        console.error('Error: Las variables de entorno para el envío de correos no están configuradas correctamente.');
        return; 
    }

    // --- CAMBIO: Usamos Luxon para un formateo más robusto ---
    const dateObj = DateTime.fromJSDate(dateTime).setZone('America/Argentina/Buenos_Aires');
    const formattedDate = dateObj.toFormat('cccc, dd \'de\' LLLL \'de\' yyyy', { locale: 'es' });
    const formattedTime = dateObj.toFormat('HH:mm');

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #00979e; text-align: center;">Confirmación de Turno - Consultorio Nutricional</h2>
                <p>Estimado/a <strong>${patientName}</strong>,</p>
                <p>Tu turno ha sido programado exitosamente con <strong>${professionalName}</strong>.</p>
                <p><strong>Detalles del Turno:</strong></p>
                <ul>
                    <li><strong>Profesional:</strong> ${professionalName}</li>
                    <li><strong>Fecha:</strong> ${formattedDate}</li>
                    <li><strong>Hora:</strong> ${formattedTime}</li>
                    <li><strong>Motivo de la consulta:</strong> ${reasonForVisit || 'No especificado'}</li>
                </ul>
                <p style="text-align: center; font-size: 0.9em; color: #777;">Este es un mensaje automático, por favor no respondas a este correo.</p>
                <p style="text-align: center; margin-top: 20px;"><a href="${process.env.FRONTEND_URL}" style="background-color: #00979e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Visitar Sitio</a></p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: patientEmail,
        subject: 'Confirmación de Turno - UNSTA',
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de confirmación enviado a ${patientEmail}`);
    } catch (error) {
        console.error(`Error al enviar email a ${patientEmail}:`, error);
    }
};

export const sendPasswordResetEmail = async (userEmail, resetToken) => {
    if (!process.env.EMAIL_HOST || !process.env.SENDER_EMAIL || !process.env.FRONTEND_URL) {
        console.error('Error: Faltan variables de entorno para el reseteo de contraseña (EMAIL_HOST, SENDER_EMAIL, FRONTEND_URL).');
        return;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #00979e; text-align: center;">Solicitud de Restablecimiento de Contraseña</h2>
                <p>Hola,</p>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no hiciste esta solicitud, puedes ignorar este correo.</p>
                <p>Para restablecer tu contraseña, haz clic en el siguiente enlace:</p>
                <p style="text-align: center; margin: 20px 0;">
                    <a href="${resetUrl}" style="background-color: #f57c00; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Restablecer Contraseña</a>
                </p>
                <p>Este enlace es válido por <strong>1 hora</strong>.</p>
                <p style="text-align: center; font-size: 0.9em; color: #777;">Si el botón no funciona, copia y pega la siguiente URL en tu navegador:</p>
                <p style="text-align: center; font-size: 0.8em; color: #999; word-break: break-all;">${resetUrl}</p>
            </div>
        </div>
    `;

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: userEmail,
        subject: 'Restablecimiento de Contraseña',
        html: htmlContent,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email de reseteo de contraseña enviado a ${userEmail}`);
    } catch (error) {
        console.error(`Error al enviar email de reseteo a ${userEmail}:`, error);
        throw new Error('No se pudo enviar el correo de restablecimiento.');
    }
};