import React, { useState, useEffect } from 'react';
import { TextField, Button, Grid, Typography, Paper, Box, Alert, CircularProgress} from '@mui/material';

const PatientForm = ({ selectedDateTime, onSubmit, onCancel, prefilledData, submissionError, isSubmitting }) => {
    const [patientDetails, setPatientDetails] = useState({
        dni: '',
        lastName: '',
        firstName: '',
        email: '',
        phone: '',
        reasonForVisit: '',
    });
    const [errors, setErrors] = useState({});

    useEffect(() => {
        if (prefilledData) {
            setPatientDetails(prevDetails => ({
                ...prevDetails,
                dni: prefilledData.dni || '',
                lastName: prefilledData.lastName || '',
                firstName: prefilledData.firstName || '',
                email: prefilledData.email || '',
                phone: prefilledData.phone || '',
            }));
        }
    }, [prefilledData]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setPatientDetails(prev => ({ ...prev, [name]: value }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };
    
    const validateForm = () => {
        const newErrors = {};
        if (!patientDetails.dni.trim()) newErrors.dni = 'DNI es requerido.';
        if (!patientDetails.lastName.trim()) newErrors.lastName = 'Apellido es requerido.';
        if (!patientDetails.firstName.trim()) newErrors.firstName = 'Nombre es requerido.';
        if (!patientDetails.email.trim()) {
            newErrors.email = 'Correo electrónico es requerido.';
        } else if (!/\S+@\S+\.\S+/.test(patientDetails.email)) {
            newErrors.email = 'El formato del correo no es válido.';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        if (validateForm()) {
            onSubmit(patientDetails, selectedDateTime);
        }
    };

    if (!selectedDateTime) return null;

    const isPatientRecognized = !!(prefilledData && prefilledData.id);

    return (
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
            <Typography variant="h5" gutterBottom component="div" sx={{ textAlign: 'center' }}>
                Confirma tus Datos para el Turno
            </Typography>
            <Typography variant="subtitle1" gutterBottom component="div" sx={{ textAlign: 'center', mb: 3 }}>
                Turno para el: {selectedDateTime.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las {selectedDateTime.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </Typography>

            {submissionError && <Alert severity="error" sx={{ mb: 2 }}>{submissionError}</Alert>}

            <Box component="form" onSubmit={handleSubmit} noValidate>
                <Grid container spacing={2} direction="column">
                    <Grid item>
                        <TextField
                            name="dni" label="DNI *" value={patientDetails.dni}
                            onChange={handleChange} fullWidth error={!!errors.dni}
                            helperText={errors.dni}
                            disabled={isPatientRecognized}
                            variant={isPatientRecognized ? "filled" : "outlined"}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            name="lastName" label="Apellido *" value={patientDetails.lastName}
                            onChange={handleChange} fullWidth error={!!errors.lastName}
                            helperText={errors.lastName}
                            disabled={isPatientRecognized}
                            variant={isPatientRecognized ? "filled" : "outlined"}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            name="firstName" label="Nombre *" value={patientDetails.firstName}
                            onChange={handleChange} fullWidth error={!!errors.firstName}
                            helperText={errors.firstName}
                            disabled={isPatientRecognized}
                            variant={isPatientRecognized ? "filled" : "outlined"}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            name="email" label="Correo Electrónico *" type="email"
                            value={patientDetails.email} onChange={handleChange}
                            fullWidth error={!!errors.email} helperText={errors.email}
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            name="phone" label="Teléfono" value={patientDetails.phone}
                            onChange={handleChange} fullWidth
                        />
                    </Grid>
                    <Grid item>
                        <TextField
                            name="reasonForVisit"
                            label="Motivo de la consulta (Opcional)"
                            multiline rows={3} fullWidth
                            value={patientDetails.reasonForVisit || ''}
                            onChange={handleChange}
                        />
                    </Grid>
                    <Grid item container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <Button type="button" fullWidth variant="outlined" onClick={onCancel} disabled={isSubmitting}>
                                Cancelar / Volver
                            </Button>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <Button type="submit" fullWidth variant="contained" disabled={isSubmitting}>
                                {isSubmitting ? <CircularProgress size={24} color="inherit" /> : 'Confirmar Turno'}
                            </Button>
                        </Grid>
                    </Grid>
                </Grid>
            </Box>
        </Paper>
    );
};

export default PatientForm;