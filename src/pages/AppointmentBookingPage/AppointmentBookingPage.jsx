import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Typography, Box, CssBaseline, AppBar, Toolbar, Alert, TextField,
    Button, CircularProgress, Paper, Dialog, DialogTitle, DialogContent, DialogActions,
    Card, CardContent, CardActions, Avatar
} from '@mui/material';
import { useParams, useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../../config';
import AvailabilityCalendar from '../../components/AvailabilityCalendar/AvailabilityCalendar.jsx';
import PatientForm from '../../components/PatientForm/PatientForm.jsx';
import AppointmentConfirmation from '../../components/AppointmentConfirmation/AppointmentConfirmation.jsx';
import SearchIcon from '@mui/icons-material/Search';

const getInitials = (name) => {
    if (!name) return '?';
    const nameParts = name.trim().split(' ');
    if (nameParts.length > 1 && nameParts[0] && nameParts[nameParts.length - 1]) {
        return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    }
    if (nameParts[0]) {
         return name.substring(0, 2).toUpperCase();
    }
    return '?';
};

const STEPS = {
    PROFESSIONAL_SELECTION: 'PROFESSIONAL_SELECTION',
    CALENDAR_SELECTION: 'CALENDAR_SELECTION',
    PATIENT_FORM: 'PATIENT_FORM',
    CONFIRMATION: 'CONFIRMATION',
};

const AnimatedStep = ({ children }) => (
    <Box
        sx={{
            animation: 'fadeInSlideUp 0.5s ease-out forwards',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
        }}
    >
        {children}
    </Box>
);

const AppointmentBookingPage = () => {
    const { professionalId: paramProfessionalId } = useParams();
    const navigate = useNavigate();

    const [currentStep, setCurrentStep] = useState(STEPS.PROFESSIONAL_SELECTION);
    const [welcomeModalOpen, setWelcomeModalOpen] = useState(true);
    const [professionals, setProfessionals] = useState([]);
    const [loadingProfessionals, setLoadingProfessionals] = useState(true);
    const [errorProfessionals, setErrorProfessionals] = useState('');
    const [selectedProfessionalId, setSelectedProfessionalId] = useState(null);
    const [selectedProfessionalName, setSelectedProfessionalName] = useState('');
    const [selectedDateTime, setSelectedDateTime] = useState(null);
    const [confirmedAppointment, setConfirmedAppointment] = useState(null);
    const [dniInput, setDniInput] = useState('');
    const [recognizedPatient, setRecognizedPatient] = useState(null);
    const [lookupLoading, setLookupLoading] = useState(false);
    const [lookupError, setLookupError] = useState('');
    const [dniLookupPerformed, setDniLookupPerformed] = useState(false);
    const [submissionError, setSubmissionError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchProfessionals = useCallback(async () => {
        setLoadingProfessionals(true);
        setErrorProfessionals('');
        try {
            const response = await fetch(`${API_BASE_URL}/api/public/professionals`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: 'No se pudieron cargar los profesionales disponibles.' }));
                throw new Error(errorData.message);
            }
            const data = await response.json();
            setProfessionals(data);

            if (paramProfessionalId) {
                const prof = data.find(p => p.id === paramProfessionalId);
                if (prof) {
                    setSelectedProfessionalId(paramProfessionalId);
                    setSelectedProfessionalName(prof.fullName);
                    setCurrentStep(STEPS.CALENDAR_SELECTION);
                } else {
                    setErrorProfessionals('El profesional seleccionado a través de la URL no es válido.');
                    setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
                }
            }
        } catch (err) {
            console.error("Error fetching professionals:", err);
            setErrorProfessionals(err.message);
        } finally {
            setLoadingProfessionals(false);
        }
    }, [paramProfessionalId]);

    useEffect(() => {
        if (!paramProfessionalId) {
            setWelcomeModalOpen(true);
        } else {
            setWelcomeModalOpen(false);
        }
        fetchProfessionals();
    }, [fetchProfessionals, paramProfessionalId]);

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
                throw new Error("DNI no encontrado. Puede continuar y completar sus datos.");
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
        if (dniLookupPerformed || !dniInput.trim()) {
            setWelcomeModalOpen(false);
            if (!paramProfessionalId) {
                setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
            }
        } else {
            setLookupError("Por favor, presione 'Buscar' para validar su DNI antes de continuar.");
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
                professionalUserId: selectedProfessionalId,
                dateTime: appointmentDateTime.toISOString(),
                dni: patientDetails.dni,
                firstName: patientDetails.firstName,
                lastName: patientDetails.lastName,
                email: patientDetails.email,
                phone: patientDetails.phone,
                reasonForVisit: patientDetails.reasonForVisit
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
                professionalName: selectedProfessionalName,
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
            setCurrentStep(STEPS.PROFESSIONAL_SELECTION);
            setSelectedProfessionalId(null);
            setSelectedProfessionalName('');
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

    const renderProfessionalSelection = () => {
        if (loadingProfessionals) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 4 }}>
                    <CircularProgress />
                    <Typography sx={{ ml: 2 }}>Cargando profesionales...</Typography>
                </Box>
            );
        }
        if (errorProfessionals) {
            return <Alert severity="error" sx={{ mt: 2 }}>{errorProfessionals}</Alert>;
        }
        return (
            <Container maxWidth="md">
                <Typography variant="h4" component="h1" align="center" gutterBottom>
                    Seleccione un Profesional
                </Typography>
                <Typography variant="body1" color="text.secondary" align="center" sx={{ mb: 4 }}>
                    Elija al profesional con quien desea agendar su turno.
                </Typography>
                <Box sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 3
                }}>
                    {professionals.map((prof) => (
                        <Card key={prof.id} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2, width: {xs: '100%', sm: '300px'} }}>
                            <Avatar src={`${API_BASE_URL}${prof.profileImageUrl}`} sx={{ width: 80, height: 80, mb: 2, fontSize: '2.5rem', bgcolor: 'secondary.main' }}>
                                {!prof.profileImageUrl && getInitials(prof.fullName)}
                            </Avatar>
                            <CardContent sx={{ textAlign: 'center', flexGrow: 1, pt: 0 }}>
                                <Typography gutterBottom variant="h6" component="div">
                                    {prof.fullName}
                                </Typography>
                                <Typography variant="body2" color="primary.main">
                                    {prof.specialty || 'Especialidad no definida'}
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => handleSelectProfessional(prof.id, prof.fullName)}
                                >
                                    Seleccionar Profesional
                                </Button>
                            </CardActions>
                        </Card>
                    ))}
                </Box>
            </Container>
        );
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', bgcolor: 'grey.100' }}>
            <CssBaseline />
            <AppBar position="static" color="primary">
                <Toolbar>
                    <Box component="img" src="/logo-unsta-white.png" sx={{ height: '36px', mr: 2 }} />
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        Gestión de Pacientes y Turnos UNSTA - Solicitud de turnos
                    </Typography>
                </Toolbar>
            </AppBar>
            <Dialog 
                open={welcomeModalOpen && !paramProfessionalId} 
                onClose={(event, reason) => {
                    if (reason !== 'backdropClick' && reason !== 'escapeKeyDown') {
                        handleCloseWelcomeModal();
                    }
                }}
                disableEscapeKeyDown
                aria-labelledby="welcome-dialog-title" 
                maxWidth="sm" 
                fullWidth
            >
                <DialogTitle id="welcome-dialog-title" sx={{ textAlign: 'center', pt: 3 }}>Bienvenido/a</DialogTitle>
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
                            <Button variant="contained" onClick={handleDniLookup} disabled={lookupLoading || !dniInput.trim()} startIcon={lookupLoading ? <CircularProgress size={20} color="inherit" /> : <SearchIcon />}>
                                Buscar
                            </Button>
                        </Box>
                        {lookupError && <Alert severity="warning" sx={{ mt: 2 }}>{lookupError}</Alert>}
                        {dniLookupPerformed && recognizedPatient && recognizedPatient.id && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                ¡Hola, {recognizedPatient.fullName}! Tus datos se completarán automáticamente.
                            </Alert>
                        )}
                    </Paper>
                    <Alert severity="info" icon={false} sx={{ bgcolor: 'grey.100' }}>
                        <Typography variant="h6" component="div" gutterBottom>ATENCIÓN:</Typography>
                        <Typography variant="body2">El turno solicitado es un compromiso.</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Si no asistirá al turno solicitado, rogamos comuncarse y cancelar el mismo para liberar el horario y pueda ser usado por otro paciente. Agradecemos su compromiso y comprensión.
                        </Typography>
                    </Alert>
                </DialogContent>
                <DialogActions sx={{ p: '16px 24px' }}>
                    <Button
                        onClick={handleCloseWelcomeModal}
                        variant="contained"
                        fullWidth
                        disabled={lookupLoading || !dniLookupPerformed}
                    >
                        Acepto, Continuar
                    </Button>
                </DialogActions>
            </Dialog>

            <Container 
                component="main" 
                maxWidth="lg" 
                sx={{ 
                    flexGrow: 1, display: 'flex', flexDirection: 'column', 
                    alignItems: 'center', justifyContent: 'flex-start',
                    pt: 4, pb: 4
                }}
            >
                {currentStep === STEPS.PROFESSIONAL_SELECTION && <AnimatedStep key="step1">{renderProfessionalSelection()}</AnimatedStep>}
                {currentStep === STEPS.CALENDAR_SELECTION && (
                    <AnimatedStep key="step2">
                        <Box sx={{ width: '100%', maxWidth: '1000px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Typography variant="h4" component="h1" gutterBottom>
                                Agendar turno con {selectedProfessionalName || 'el profesional'}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" sx={{ mb: 3, textAlign: 'center', maxWidth: '700px' }}>
                                Haga clic sobre un horario disponible para comenzar su reserva.
                            </Typography>
                            {selectedProfessionalId ? (
                                <Box sx={{ width: '100%' }}>
                                     <AvailabilityCalendar onSlotSelect={handleSlotSelected} professionalId={selectedProfessionalId} />
                                </Box>
                            ) : <CircularProgress />}
                            <Box sx={{ mt: 3 }}>
                                {!paramProfessionalId && (
                                    <Button variant="outlined" onClick={handleCancelForm}>Volver a Selección de Profesional</Button>
                                )}
                            </Box>
                        </Box>
                    </AnimatedStep>
                )}
                {currentStep === STEPS.PATIENT_FORM && (
                    <AnimatedStep key="step3">
                        <Box sx={{ width: '100%', maxWidth: '700px' }}>
                            <PatientForm
                                selectedDateTime={selectedDateTime} onSubmit={handleFormSubmit} onCancel={handleCancelForm}
                                prefilledData={recognizedPatient} submissionError={submissionError} isSubmitting={isSubmitting}
                            />
                        </Box>
                    </AnimatedStep>
                )}
                {currentStep === STEPS.CONFIRMATION && (
                    <AnimatedStep key="step4">
                         <Box sx={{ width: '100%', maxWidth: '700px' }}>
                            <AppointmentConfirmation appointmentDetails={confirmedAppointment} onBookAnother={handleBookAnother} />
                        </Box>
                    </AnimatedStep>
                )}
            </Container>
            
            <style>
                {`
                    @keyframes fadeInSlideUp {
                        from { opacity: 0; transform: translateY(15px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </Box>
    );
};

export default AppointmentBookingPage;