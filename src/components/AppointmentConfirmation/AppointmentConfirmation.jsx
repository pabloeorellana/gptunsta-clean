import React from 'react';
import { Typography, Paper, Button, Box, Alert, Stack, Divider } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

const AppointmentConfirmation = ({ appointmentDetails, onBookAnother }) => {
    if (!appointmentDetails) {
        return null;
    }

    const { patient, dateTime, professionalName } = appointmentDetails;
    const patientName = `${patient.firstName || ''} ${patient.lastName || ''}`.trim();
    
    const formattedDate = dateTime.toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    const formattedTime = dateTime.toLocaleTimeString('es-ES', {
        hour: '2-digit', minute: '2-digit'
    });

    return (
        <Paper 
            elevation={3} 
            sx={{ 
                p: { xs: 2, sm: 4 }, 
                mt: 3, 
                textAlign: 'center',
                borderRadius: '12px',
                border: '1px solid',
                borderColor: 'divider'
            }}
        >
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                ¡Turno Confirmado!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Hemos agendado tu cita exitosamente. Recibirás una confirmación por correo electrónico.
            </Typography>

            <Box 
                sx={{ 
                    bgcolor: 'grey.50', 
                    p: 3, 
                    borderRadius: '8px', 
                    textAlign: 'left',
                    border: '1px solid',
                    borderColor: 'grey.200'
                }}
            >
                <Typography variant="h6" gutterBottom sx={{ textAlign: 'center', color: 'primary.dark', mb: 2 }}>
                    Detalles de tu Reserva
                </Typography>
                <Stack spacing={1.5}>
                    <Typography><strong>Paciente:</strong> {patientName}</Typography>
                    <Divider />
                    <Typography><strong>Profesional:</strong> {professionalName}</Typography>
                    <Divider />
                    <Typography><strong>Fecha:</strong> {formattedDate}</Typography>
                    <Divider />
                    <Typography><strong>Hora:</strong> {formattedTime} hs.</Typography>
                </Stack>
            </Box>

            <Alert 
                icon={<InfoOutlinedIcon fontSize="inherit" />} 
                severity="info" 
                sx={{ mt: 3, textAlign: 'left' }}
            >
                El turno solicitado es un compromiso. Si no puedes asistir, por favor, comunícate con nosotros para cancelarlo y así liberar el horario para otro paciente.
            </Alert>

            <Button 
                variant="contained" 
                onClick={onBookAnother} 
                size="large"
                sx={{ mt: 4, px: 5, py: 1.5, borderRadius: '8px' }}
            >
                Reservar Otro Turno
            </Button>
        </Paper>
    );
};

export default AppointmentConfirmation;