import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Box, CssBaseline, AppBar, Toolbar, Alert, TextField,
    Button, CircularProgress, Paper, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useParams } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar.jsx';
import PatientForm from '../../components/PatientForm/PatientForm.jsx';
import AppointmentConfirmation from '../../components/AppointmentConfirmation/AppointmentConfirmation.jsx';
import MedicalInformationIcon from '@mui/icons-material/MedicalInformation';
import SearchIcon from '@mui/icons-material/Search';
import ProfessionalSelectionStep from '../../components/ProfessionalSelectionStep/ProfessionalSelectionStep.jsx';

const STEPS = {
    WELCOME_DNI: 0,
    PROFESSIONAL_SELECTION: 1,
    CALENDAR_SELECTION: 2,
    PATIENT_FORM: 3,
    CONFIRMATION: 4,
};

const AppointmentBookingPage = () => {
    const { professionalId: paramProfessionalId } = useParams();

    // Estados para controlar el flujo
    const [currentStep, setCurrentStep] = useState(STEPS.PROFESSIONAL_SELECTION);
    const [welcomeModalOpen, setWelcomeModalOpen] = useState(true);

    // Estados para los datos del flujo
    const [selectedProfessionalId, setSelectedProfessionalId] = useState(null);
    const [selectedProfessionalName, setSelectedProfessionalName] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState(null);
    const [confirmedAppointment, setConfirmedAppointment] = useState(null);

    // Estados para el DNI lookup
    const [dniInput, setDniInput] = useState('');
    const [recognizedPatient, setRecognizedPatient] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [dniLookupPerformed, setDniLookupPerformed] = useState(false);

    // Estados de envío del formulario
    const [submissionError, setSubmissionError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (paramProfessionalId) {
            setSelectedProfessionalId(paramProfessionalId);
            setCurrentStep(STEPS.CALENDAR_SELECTION);
            const fetchProfessionalName = async () => {
                try {
                    const response = await fetch(`${API_BASE_URL}/api/public/professionals`);
                    const data = await response.json();
                    const prof = data.find(p => p.id === paramProfessionalId);
                    if (prof) {
                        setSelectedProfessionalName(prof.fullName);
                    }
                } catch (err) {
                    console.error("Error fetching professional name:", err);
                }
            };
            fetchProfessionalName();
        } else {
            setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
        }
    }, [paramProfessionalId]);

    const handleDniLookup = async () => {
        if (!dniInput.trim()) {
            setLookupError("Por favor, ingrese un DNI válido para buscar.");
            return;
        }
        setLookupLoading(true);
        setLookupError('');
        setRecognizedPatient(null);
        setDniLookupPerformed(true);

        try {
            const response = await fetch(`${API_BASE_URL}/api/public/patients/lookup?dni=${dniInput.trim()}`);
            if (response.status === 404) {
                setRecognizedPatient({ dni: dniInput.trim() });
                throw new Error("DNI no encontrado. Por favor, complete sus datos.");
            }
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || "Error del servidor al buscar el DNI.");
            }
            const patientData = await response.json();
            setRecognizedPatient(patientData);
        } catch (error) {
            setLookupError(error.message);
            if (!recognizedPatient) {
                setRecognizedPatient({ dni: dniInput.trim() });
            }
        } finally {
            setLookupLoading(false);
        }
    };

    const handleCloseWelcomeModal = () => {
        setWelcomeModalOpen(false);
        if (!paramProfessionalId) {
            setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
        }
    };

    const handleSelectProfessional = (profId, profName) => {
        setSelectedProfessionalId(profId);
        setSelectedProfessionalName(profName);
        setCurrentStep(STEPS.CALENDAR_SELECTION);
    };

    const handleSlotSelected = (dateTime) => {
        setSelectedDateTime(dateTime);
        setCurrentStep(STEPS.PATIENT_FORM);
    };

    const handleFormSubmit = async (patientDetails, appointmentDateTime) => {
        setIsSubmitting(true);
        setSubmissionError('');
        try {
            const payload = {
                professionalId: selectedProfessionalId,
                dateTime: appointmentDateTime.toISOString(),
                patientDetails: patientDetails
            };

            const response = await fetch(`${API_BASE_URL}/api/public/appointments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || "No se pudo confirmar el turno.");
            }

            setConfirmedAppointment({
                patient: patientDetails,
                dateTime: appointmentDateTime,
                appointmentDetails: data
            });
            setCurrentStep(STEPS.CONFIRMATION);
        } catch (error) {
            console.error("Error al confirmar el turno:", error);
            setSubmissionError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancelForm = () => {
        if (currentStep === STEPS.CALENDAR_SELECTION) {
            if (!paramProfessionalId) {
                setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
                setSelectedProfessionalId(null);
                setSelectedProfessionalName('');
            } else {
                setSelectedDateTime(null);
            }
        } else if (currentStep === STEPS.PATIENT_FORM) {
            setCurrentStep(STEPS.CALENDAR_SELECTION);
        }
    };

    const handleBookAnother = () => {
        setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
        setWelcomeModalOpen(true);
        setSelectedProfessionalId(null);
        setSelectedProfessionalName('');
        setSelectedDateTime(null);
        setConfirmedAppointment(null);
        setDniInput('');
        setRecognizedPatient(null);
        setLookupError('');
        setDniLookupPerformed(false);
        setSubmissionError('');
        setIsSubmitting(false);
    };

    return (
        <>
            <CssBaseline />
            <AppBar position="static" color="primary">
                <Toolbar>
                    <MedicalInformationIcon sx={{ mr: 2 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Gestión de Pacientes y Turnos UNSTA  - Solicitud de turnos
                    </Typography>
                </Toolbar>
            </AppBar>
            <Dialog open={welcomeModalOpen} disableEscapeKeyDown aria-labelledby="welcome-dialog-title" maxWidth="sm" fullWidth>
                <DialogTitle id="welcome-dialog-title" sx={{ textAlign: 'center', pt: 3 }}>Bienvenido a NutriSmart</DialogTitle>
                <DialogContent>
                    <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
                        <Typography variant="h6" gutterBottom>¿Ya eres paciente?</Typography>
                        <Typography variant="body2" sx={{ mb: 2 }}>
                            Ingresa tu DNI para una reserva más rápida. Si es tu primera vez, ingresa tu DNI y presiona "Buscar" para continuar.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField
                                label="Ingresar DNI" variant="outlined" size="small"
                                value={dniInput}
                                onChange={(e) => { setDniInput(e.target.value); setDniLookupPerformed(false); }}
                                sx={{ flexGrow: 1 }}
                                onKeyPress={(e) => e.key === 'Enter' && handleDniLookup()}
                            />
                            <Button
                                variant="contained" onClick={handleDniLookup} disabled={lookupLoading}
                                startIcon={lookupLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}
                            >
                                Buscar
                            </Button>
                        </Box>
                        {lookupError && <Alert severity="warning" sx={{ mt: 2 }}>{lookupError}</Alert>}
                        {recognizedPatient && recognizedPatient.id && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                ¡Hola, {recognizedPatient.fullName}! Tus datos se completarán automáticamente.
                            </Alert>
                        )}
                    </Paper>
                    <Alert severity="info" icon={false} sx={{ bgcolor: 'grey.100' }}>
                        <Typography variant="h6" component="div" gutterBottom>ATENCIÓN:</Typography>
                        <Typography variant="body2">El turno solicitado es un compromiso.</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Si no asistirá al turno solicitado, rogamos que cancele el mismo para liberar el horario y
                            pueda ser usado por otro paciente. Agradecemos su compromiso y comprensión.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button
                        onClick={handleCloseWelcomeModal}
                        variant="contained"
                        fullWidth
                        disabled={lookupLoading}
                    >
                        Acepto, Continuar
                    </Button>
                </DialogActions>
            </Dialog>

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    {currentStep === STEPS.PROFESSIONAL_SELECTION && (
                        <ProfessionalSelectionStep
                            onSelectProfessional={handleSelectProfessional}
                            preSelectedProfessionalId={paramProfessionalId}
                        />
                    )}

                    {currentStep === STEPS.CALENDAR_SELECTION && (
                        // CORRECCIÓN: Se envuelve toda esta sección en un Box con ancho máximo para centrarla.
                        <Box sx={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="h4" component="h1" gutterBottom>
                                Agendar turno con {selectedProfessionalName || 'el profesional'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: '700px' }}>
                                Haga clic sobre un horario disponible para comenzar su reserva.
                            </Typography>
                            
                            {selectedProfessionalId ? (
                                // CORRECCIÓN: El Box que envuelve el calendario ahora es el que limita la altura y tiene scroll.
                                <Box sx={{ width: '100%' }}>
                                     <AvailabilityCalendar
                                        onSlotSelect={handleSlotSelected}
                                        professionalId={selectedProfessionalId}
                                    />
                                </Box>
                            ) : (
                                <Alert severity="error">No se ha especificado un profesional válido para mostrar la disponibilidad.</Alert>
                            )}
                            
                            <Box sx={{ mt: 3 }}>
                                <Button variant="outlined" onClick={handleCancelForm}>
                                    Volver a Selección de Profesional
                                </Button>
                            </Box>
                        </Box>
                    )}

                    {currentStep === STEPS.PATIENT_FORM && (
                        <Box sx={{ width: '100%', maxWidth: '700px' }}>
                            <PatientForm
                                selectedDateTime={selectedDateTime}
                                onSubmit={handleFormSubmit}
                                onCancel={handleCancelForm}
                                prefilledData={recognizedPatient}
                                submissionError={submissionError}
                                isSubmitting={isSubmitting}
                            />
                        </Box>
                    )}

                    {currentStep === STEPS.CONFIRMATION && (
                         <Box sx={{ width: '100%', maxWidth: '700px' }}>
                            <AppointmentConfirmation appointmentDetails={confirmedAppointment} onBookAnother={handleBookAnother} />
                        </Box>
                    )}
                </Box>
            </Container>
        </>
    );
};

export default AppointmentBookingPage;