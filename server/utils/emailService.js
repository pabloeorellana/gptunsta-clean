import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; 
import crypto from 'crypto';
import { DateTime } from 'luxon';

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

    const dateObj = DateTime.fromJSDate(dateTime).setZone('America/Argentina/Buenos_Aires');
    const formattedDate = dateObj.toFormat('cccc, dd \'de\' LLLL \'de\' yyyy', { locale: 'es' });
    const formattedTime = dateObj.toFormat('HH:mm \'hs.\'');

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; }
            .header { background-color: #194da0; padding: 20px; text-align: center; border-bottom: 1px solid #194da0; }
            .header img { height: 50px; }
            .content { padding: 30px; text-align: center; color: #333333; }
            .content-icon { font-size: 48px; color: #194da0; }
            h1 { color: #194da0; margin-top: 20px; margin-bottom: 10px; font-size: 24px; }
            p { line-height: 1.6; color: #555555; font-size: 16px; }
            .details { background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: left; }
            .details p { margin: 10px 0; font-size: 16px; }
            .details strong { color: #333333; }
            .important-box { background-color: #e3f2fd; padding: 20px; margin-top: 20px; border-radius: 5px; text-align: center; }
            .important-box h2 { margin: 0 0 10px 0; color: #0d47a1; font-size: 18px; }
            .button-container { text-align: center; margin-top: 30px; }
            .button { background-color: #194da0; color: #ffffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
            .footer { background-color: #194da0; padding: 20px; text-align: center; color: #ffffff; }
            .footer p { color: #e0e0e0; font-size: 12px; margin: 5px 0; }
            .footer a { color: #ffffff; text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://www.unsta.edu.ar/wp-content/uploads/2018/09/LOGO-2-01.png" alt="Logo UNSTA">
            </div>
            <div class="content">
                <div class="content-icon">&#128197;</div> <!-- Emoji de calendario -->
                <h1>Tu Turno ha sido Confirmado</h1>
                <p>Estimado/a <strong>${patientName}</strong>,</p>
                <p>Te contactamos para informarte que tu turno en el Consultorio Nutricional UNSTA ha sido agendado exitosamente. A continuación, encontrarás los detalles.</p>

                <div class="details">
                    <h2 style="text-align: center; color: #194da0; margin-top:0;">Detalles del Turno</h2>
                    <p><strong>Profesional:</strong> ${professionalName}</p>
                    <p><strong>Fecha:</strong> ${formattedDate}</p>
                    <p><strong>Hora:</strong> ${formattedTime}</p>
                    <p><strong>Motivo de la consulta:</strong> ${reasonForVisit || 'No especificado'}</p>
                </div>

                <div class="important-box">
                    <h2>Información Importante</h2>
                    <p style="font-size: 14px; color: #0d47a1;">El turno solicitado es un compromiso. Si no puedes asistir, por favor, comunícate con nosotros para cancelarlo y así liberar el horario para otro paciente.</p>
                </div>

                <div class="button-container">
                    <a href="${process.env.FRONTEND_URL}" class="button">Visitar Nuestro Sitio</a>
                </div>
            </div>
            <div class="footer">
                <p>Consultorio Nutricional UNSTA</p>
                <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
                <p><a href="#">Política de Privacidad</a> &bull; <a href="#">Contacto</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"${process.env.SENDER_NAME || 'Consultorio UNSTA'}" <${process.env.SENDER_EMAIL}>`,
        to: patientEmail,
        subject: 'Confirmación de Turno - Consultorio Nutricional UNSTA',
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
    // ... (esta función se mantiene igual)
    if (!process.env.EMAIL_HOST || !process.env.SENDER_EMAIL || !process.env.FRONTEND_URL) {
        console.error('Error: Faltan variables de entorno para el reseteo de contraseña (EMAIL_HOST, SENDER_EMAIL, FRONTEND_URL).');
        return;
    }

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e0e0e0; }
            .header { background-color: #194da0; padding: 20px; text-align: center; border-bottom: 1px solid #e0e0e0; }
            .header img { height: 50px; }
            .content { padding: 30px; text-align: center; color: #333333; }
            .content-icon { font-size: 48px; color: #f57c00; }
            h1 { color: #194da0; margin-top: 20px; margin-bottom: 10px; font-size: 24px; }
            p { line-height: 1.6; color: #555555; font-size: 16px; }
            .important-box { background-color: #fff3e0; padding: 20px; margin-top: 20px; border-radius: 5px; text-align: center; border-left: 5px solid #f57c00; }
            .important-box h2 { margin: 0 0 10px 0; color: #e65100; font-size: 18px; }
            .button-container { text-align: center; margin-top: 30px; }
            .button-action { background-color: #f57c00; color: #ffffff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block; }
            .fallback-link { font-size: 12px; color: #777; margin-top: 20px; }
            .fallback-link a { color: #777; }
            .footer { background-color: #194da0; padding: 20px; text-align: center; color: #ffffff; }
            .footer p { color: #e0e0e0; font-size: 12px; margin: 5px 0; }
            .footer a { color: #ffffff; text-decoration: underline; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <img src="https://www.unsta.edu.ar/wp-content/uploads/2018/09/LOGO-2-01.png" alt="Logo UNSTA">
            </div>
            <div class="content">
                <div class="content-icon">&#128273;</div> <!-- Emoji de candado -->
                <h1>Restablece tu Contraseña</h1>
                <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta. Si no hiciste esta solicitud, puedes ignorar este correo de forma segura.</p>
                
                <div class="button-container">
                    <a href="${resetUrl}" class="button-action">Restablecer Contraseña</a>
                </div>

                <div class="important-box">
                    <h2>Aviso de Seguridad</h2>
                    <p style="font-size: 14px; color: #e65100;">Este enlace es válido por <strong>1 hora</strong> desde el momento en que se solicitó.</p>
                </div>
                
                <p class="fallback-link">Si tienes problemas con el botón, copia y pega la siguiente URL en tu navegador:<br><a href="${resetUrl}">${resetUrl}</a></p>
            </div>
            <div class="footer">
                <p>Consultorio Nutricional UNSTA</p>
                <p>Este es un mensaje automático, por favor no respondas a este correo.</p>
                <p><a href="#">Política de Privacidad</a> &bull; <a href="#">Contacto</a></p>
            </div>
        </div>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `"${process.env.SENDER_NAME || 'Consultorio UNSTA'}" <${process.env.SENDER_EMAIL}>`,
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