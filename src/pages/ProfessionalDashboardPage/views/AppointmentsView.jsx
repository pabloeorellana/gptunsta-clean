import React, { useState, useEffect, useCallback, useRef } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Typography, Paper, Modal, Box, Button, Chip, Grid, TextField,
    Select, MenuItem, FormControl, InputLabel, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Alert,
    Avatar, Tooltip, Stack, CircularProgress
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import { format, parseISO, setMinutes, setSeconds, setMilliseconds, startOfWeek, endOfWeek } from 'date-fns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { LocalizationProvider, DateTimePicker, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNotification } from '../../../context/NotificationContext';

const statusColors = {
    SCHEDULED: { backgroundColor: '#3f51b5', color: 'white', label: 'Programado' },
    CONFIRMED: { backgroundColor: '#1976d2', color: 'white', label: 'Confirmado' },
    COMPLETED: { backgroundColor: '#4caf50', color: 'white', label: 'Completado' },
    CANCELED_PATIENT: { backgroundColor: '#f44336', color: 'white', label: 'Cancelado (Paciente)' },
    CANCELED_PROFESSIONAL: { backgroundColor: '#d32f2f', color: 'white', label: 'Cancelado (Profesional)' },
    NO_SHOW: { backgroundColor: '#757575', color: 'white', label: 'No Asistió' },
};
const availableStatuses = Object.keys(statusColors);
const modalStyle = {
    position: 'absolute', top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 500, md: 600 },
    bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,
    maxHeight: '90vh', overflowY: 'auto'
};
const initialNewAppointmentState = { patient: null, dateTime: null, reasonForVisit: '', };
const initialNewPatientFormDataState = { dni: '', lastName: '', firstName: '', email: '', phone: '', birthDate: null };

const AppointmentsView = () => {
    const [existingPatients, setExistingPatients] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [openNewAppointmentModal, setOpenNewAppointmentModal] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState(initialNewAppointmentState);
    const [newAppointmentErrors, setNewAppointmentErrors] = useState({});
    const [openCreatePatientSubModal, setOpenCreatePatientSubModal] = useState(false);
    const [newPatientFormData, setNewPatientFormData] = useState(initialNewPatientFormDataState);
    const [newPatientFormErrors, setNewPatientFormErrors] = useState({});
    const [isReprogramming, setIsReprogramming] = useState(false);
    const [newDateTimeForReprogram, setNewDateTimeForReprogram] = useState(null);
    const [openDeleteAppointmentConfirmModal, setOpenDeleteAppointmentConfirmModal] = useState(false);
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [professionalNotesModal, setProfessionalNotesModal] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const calendarRef = useRef(null);
    const { showNotification } = useNotification();
    const [modalActionLoading, setModalActionLoading] = useState(false);

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '';
        const nameParts = name.trim().split(' ');
        if (nameParts.length === 1 && nameParts[0] === '') return '';
        if (nameParts.length > 1) {
            const firstInitial = nameParts[0]?.[0] || '';
            const lastInitial = nameParts[nameParts.length - 1]?.[0] || '';
            return `${firstInitial}${lastInitial}`.toUpperCase();
        }
        return name.substring(0, 2).toUpperCase();
    };

    const fetchAppointments = useCallback(async (viewInfo) => {
        setLoading(true);
        setError('');
        try {
            const startDate = format(viewInfo?.start || startOfWeek(new Date(), {locale: fnsEsLocale}), 'yyyy-MM-dd');
            const endDate = format(viewInfo?.end || endOfWeek(new Date(), {locale: fnsEsLocale}), 'yyyy-MM-dd');
            const data = await authFetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`);
            const appointmentsData = Array.isArray(data) ? data : [];
            const formattedEvents = appointmentsData.map(appt => ({
                id: String(appt.id),
                title: appt.title,
                start: appt.start,
                end: appt.end,
                extendedProps: {
                    status: appt.status,
                    reasonForVisit: appt.reasonForVisit,
                    professionalNotes: appt.professionalNotes || '',
                    patientId: appt.patientId,
                    patientDni: appt.patientDni,
                    patientEmail: appt.patientEmail,
                    patientPhone: appt.patientPhone
                },
                backgroundColor: statusColors[appt.status]?.backgroundColor || '#757575',
                borderColor: statusColors[appt.status]?.borderColor || '#757575',
            }));
            setAllEvents(formattedEvents);
        } catch (err) {
            setError(err.message || "Error al cargar los turnos.");
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchPatientsForAutocomplete = useCallback(async () => {
        try {
            const data = await authFetch('/api/patients');
            setExistingPatients(data || []);
        } catch (err) {
             setError(err.message || "Error al cargar pacientes.");
        }
    }, []);

    useEffect(() => {
        fetchPatientsForAutocomplete();
    }, [fetchPatientsForAutocomplete]);

    useEffect(() => {
        let eventsToDisplay = allEvents;
        if (statusFilter && statusFilter !== 'ALL') {
            eventsToDisplay = allEvents.filter(event => event.extendedProps.status === statusFilter);
        }
        setFilteredEvents(eventsToDisplay);
    }, [allEvents, statusFilter]);

    const handleEventClick = useCallback((clickInfo) => {
        const eventData = {
            id: clickInfo.event.id, title: clickInfo.event.title,
            start: clickInfo.event.startStr, end: clickInfo.event.endStr,
            ...clickInfo.event.extendedProps,
        };
        setSelectedEvent(eventData);
        setProfessionalNotesModal(eventData.professionalNotes || '');
        setIsReprogramming(false);
        setNewDateTimeForReprogram(null);
        setOpenDetailModal(true);
    }, []);

    const handleCloseDetailModal = () => {
        setOpenDetailModal(false); setSelectedEvent(null); setIsReprogramming(false); setNewDateTimeForReprogram(null);
    };

    const handleChangeStatus = async (event) => {
        const newStatus = event.target.value;
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/status`, {
                    method: 'PUT', body: JSON.stringify({ status: newStatus }),
                })
                showNotification('Estado del turno actualizado.', 'success');

                const updatedEvents = allEvents.map(e => e.id === selectedEvent.id ? { ...e, extendedProps: { ...e.extendedProps, status: newStatus }, backgroundColor: statusColors[newStatus]?.backgroundColor, borderColor: statusColors[newStatus]?.borderColor } : e);
                setAllEvents(updatedEvents);
                setSelectedEvent(prev => ({...prev, status: newStatus}));
            } catch (err) { showNotification(`Error cambiando estado: ${err.message}`, 'error');}
        }
    };

    const handleSaveProfessionalNotes = async () => {
        if (selectedEvent) {
            setModalActionLoading(true);
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/notes`, {
                    method: 'PUT', body: JSON.stringify({ professionalNotes: professionalNotesModal }),
                })
                showNotification("Notas guardadas exitosamente.", "success");
                const updatedEvents = allEvents.map(e => e.id === selectedEvent.id ? { ...e, extendedProps: { ...e.extendedProps, professionalNotes: professionalNotesModal } } : e);
                setAllEvents(updatedEvents);
                setSelectedEvent(prev => ({...prev, professionalNotes: professionalNotesModal}));
                 showNotification("Notas guardadas.", "success");
            } catch (err) {showNotification(`Error al guardar notas: ${err.message}`, "error");}
            finally {
                setModalActionLoading(false);
            }
        }
    };

    const handleOpenNewAppointmentModal = () => setOpenNewAppointmentModal(true);
    const handleCloseNewAppointmentModal = () => {
        setOpenNewAppointmentModal(false); setNewAppointmentData(initialNewAppointmentState); setNewAppointmentErrors({});
    };
    const handleNewAppointmentChange = (event) => {
        const { name, value } = event.target;
        setNewAppointmentData(prev => ({ ...prev, [name]: value }));
    };
    const handleNewAppointmentDateChange = (newValue) => {
        if (newValue) {
            const minutes = newValue.getMinutes();
            if (minutes % 30 !== 0) {
                alert("Por favor, seleccione horarios en incrementos de 30 minutos (ej. 09:00, 09:30).");
                const roundedMinutes = Math.floor(minutes / 30) * 30;
                newValue = setMilliseconds(setSeconds(setMinutes(newValue, roundedMinutes),0),0);
            }
            const hour = newValue.getHours();
            if (hour < 7 || (hour >= 22)) {
                alert("Los turnos solo pueden programarse entre las 07:00 y las 21:59.");
                return;
            }
        }
        setNewAppointmentData(prev => ({ ...prev, dateTime: newValue }));
    };
    const handleNewAppointmentPatientChange = (event, newValue) => {
        setNewAppointmentData(prev => ({ ...prev, patient: newValue }));
    };
    const validateNewAppointmentForm = () => {
        const errors = {};
        if (!newAppointmentData.patient) errors.patient = 'Seleccione un paciente.';
        if (!newAppointmentData.dateTime) errors.dateTime = 'Seleccione fecha y hora.';
        setNewAppointmentErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveNewAppointment = async () => {
        if (!validateNewAppointmentForm()) return;
        const { patient, dateTime, reasonForVisit } = newAppointmentData;
        const newAppointmentPayload = {
            patientId: patient.id,
            dateTime: dateTime.toISOString(),
            reasonForVisit
        };
        try {
            const savedAppointment = await authFetch('/api/appointments/manual', {
                method: 'POST', body: JSON.stringify(newAppointmentPayload),
            });
            if (savedAppointment) {
                const newEvent = {
                    id: String(savedAppointment.id), title: savedAppointment.title,
                    start: savedAppointment.start, end: savedAppointment.end,
                    extendedProps: {
                        status: savedAppointment.status, reasonForVisit: savedAppointment.reasonForVisit,
                        professionalNotes: savedAppointment.professionalNotes || '', patientId: savedAppointment.patientId,
                        patientDni: savedAppointment.patientDni, patientEmail: savedAppointment.patientEmail,
                        patientPhone: savedAppointment.patientPhone
                    },
                    backgroundColor: statusColors[savedAppointment.status]?.backgroundColor || '#757575',
                    borderColor: statusColors[savedAppointment.status]?.borderColor || '#757575',
                };
                setAllEvents(prev => [...prev, newEvent]);
            }
            handleCloseNewAppointmentModal();
        } catch (err) {
            setNewAppointmentErrors(prev => ({ ...prev, form: err.message }));
        }
    };

    const handleOpenCreatePatientSubModal = () => {
        setNewPatientFormData(initialNewPatientFormDataState); setNewPatientFormErrors({}); setOpenCreatePatientSubModal(true);
    };
    const handleCloseCreatePatientSubModal = () => setOpenCreatePatientSubModal(false);
    const handleNewPatientFormChange = (event) => {
        const { name, value } = event.target;
        setNewPatientFormData(prev => ({ ...prev, [name]: value }));
        if (newPatientFormErrors[name]) setNewPatientFormErrors(prev => ({...prev, [name]: null}));
    };
    const handleNewPatientFormDateChange = (newDate) => {
        setNewPatientFormData(prev => ({ ...prev, birthDate: newDate }));
    };
    const validateNewPatientSubForm = () => {
        const errors = {};
        if (!newPatientFormData.dni.trim()) errors.dni = 'DNI es requerido.';
        if (existingPatients.some(p => p.dni === newPatientFormData.dni.trim())) errors.dni = 'Este DNI ya está registrado.';
        if (!newPatientFormData.lastName.trim()) errors.lastName = 'Apellido es requerido.';
        if (!newPatientFormData.firstName.trim()) errors.firstName = 'Nombre es requerido.';
        if (!newPatientFormData.email.trim()) errors.email = 'Email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(newPatientFormData.email)) errors.email = 'Formato de email inválido.';
        setNewPatientFormErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveNewPatientFromSubModal = async () => {
        if (!validateNewPatientSubForm()) return;
        const newPatientPayload = {
            dni: newPatientFormData.dni, lastName: newPatientFormData.lastName,
            firstName: newPatientFormData.firstName, email: newPatientFormData.email,
            phone: newPatientFormData.phone,
            birthDate: newPatientFormData.birthDate ? format(newPatientFormData.birthDate, 'yyyy-MM-dd') : null,
        };
        try {
            const savedPatient = await authFetch('/api/patients', { method: 'POST', body: JSON.stringify(newPatientPayload) });
            if(savedPatient){
                const patientWithFullName = {...savedPatient, fullName: `${savedPatient.firstName || ''} ${savedPatient.lastName || ''}`.trim()};
                setExistingPatients(prev => [...prev, patientWithFullName]);
                setNewAppointmentData(prev => ({ ...prev, patient: patientWithFullName }));
            }
            handleCloseCreatePatientSubModal();
        } catch (err) {
            setNewPatientFormErrors(prev => ({...prev, form: err.message}));
        }
    };

    const handleDateSelect = (selectInfo) => {
        setNewAppointmentData({ ...initialNewAppointmentState, dateTime: selectInfo.start, });
        setOpenNewAppointmentModal(true);
        let calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
    };

    const handleOpenDeleteAppointmentModal = () => { setOpenDeleteAppointmentConfirmModal(true); };
    const handleCloseDeleteAppointmentModal = () => { setOpenDeleteAppointmentConfirmModal(false); };
    const handleConfirmDeleteAppointment = async () => {
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}`, { method: 'DELETE' });
                setAllEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
                showNotification('Turno eliminado correctamente.', 'success');
                handleCloseDeleteAppointmentModal();
                handleCloseDetailModal();
            } catch (err) {showNotification(`Error eliminando turno: ${err.message}`, 'error'); }
        }
    };

    const handleToggleReprogramming = () => {
        setIsReprogramming(!isReprogramming);
        if (!isReprogramming && selectedEvent) {
            setNewDateTimeForReprogram(parseISO(selectedEvent.start));
        } else { setNewDateTimeForReprogram(null); }
    };

    const handleConfirmReprogramming = async () => {
        if (selectedEvent && newDateTimeForReprogram) {
            if (newDateTimeForReprogram) {
                const minutes = newDateTimeForReprogram.getMinutes();
                if (minutes % 30 !== 0) {
                    alert("Por favor, seleccione horarios para reprogramar en incrementos de 30 minutos (ej. 09:00, 09:30).");
                    return;
                }
                const hour = newDateTimeForReprogram.getHours();
                if (hour < 7 || (hour >= 22)) {
                    alert("Los turnos solo pueden reprogramarse entre las 07:00 y las 21:59.");
                    return;
                }
            }
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/reprogram`, {
                    method: 'PUT', body: JSON.stringify({ newDateTime: newDateTimeForReprogram.toISOString() }),
                })
                    showNotification('Turno reprogramado exitosamente.', 'success');

                const calendarApi = calendarRef.current.getApi();
                const eventToUpdate = calendarApi.getEventById(selectedEvent.id);
                const duration = parseISO(selectedEvent.end).getTime() - parseISO(selectedEvent.start).getTime();

                if (eventToUpdate) {
                    const newEndDate = new Date(newDateTimeForReprogram.getTime() + duration);

                    eventToUpdate.setStart(newDateTimeForReprogram);
                    eventToUpdate.setEnd(newEndDate);
                }

                setAllEvents(prevEvents =>
                    prevEvents.map(event =>
                        event.id === selectedEvent.id
                            ? { ...event, start: newDateTimeForReprogram.toISOString(), end: new Date(newDateTimeForReprogram.getTime() + duration).toISOString() }
                            : event
                    )
                );

                handleCloseDetailModal();
            } catch (err) {showNotification(`Error reprogramando turno: ${err.message}`, 'error');}
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fnsEsLocale}>
            <Paper elevation={3} sx={{ p: {xs: 1, sm: 2, md: 3} }}>
                <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
                    <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>Mi Agenda de Turnos</Typography>
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{minWidth: 180}}>
                            <InputLabel>Filtrar por Estado</InputLabel>
                            <Select value={statusFilter} label="Filtrar por Estado" onChange={(e) => setStatusFilter(e.target.value)}>
                                <MenuItem value="ALL">Todos los turnos</MenuItem>
                                {availableStatuses.map(statusKey => (<MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>))}
                            </Select>
                        </FormControl>
                        <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenNewAppointmentModal}>Añadir Turno</Button>
                    </Stack>
                </Stack>
                {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
                {loading && <Box sx={{display:'flex', justifyContent:'center', my:2}}><CircularProgress/></Box>}
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                    initialView="timeGridWeek"
                    locale={esLocale}
                    weekends={true}
                    events={filteredEvents}
                    datesSet={(viewInfo) => fetchAppointments(viewInfo)}
                    eventClick={handleEventClick}
                    editable={false}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateSelect}
                    contentHeight="auto"
                    allDaySlot={false}
                    slotMinTime="07:00:00"
                    slotMaxTime="22:00:00"
                    slotDuration="00:30:00"
                    snapDuration="00:15:00"
                    slotLabelFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
                    nowIndicator={true}
                />

                {selectedEvent && (
                    <Modal open={openDetailModal} onClose={handleCloseDetailModal}>
                        <Box sx={modalStyle}>
                            <Typography variant="h6" component="h2" gutterBottom>Detalles del Turno</Typography>
                            <Chip label={statusColors[selectedEvent.status]?.label || selectedEvent.status} style={{ backgroundColor: statusColors[selectedEvent.status]?.backgroundColor, color: statusColors[selectedEvent.status]?.color, marginBottom: 16 }}/>
                            <Grid container spacing={1.5} direction="column" sx={{ mt: 1 }}>
                                <Grid item><Typography><strong>Paciente:</strong> {selectedEvent.title}</Typography></Grid>
                                <Grid item><Typography><strong>DNI:</strong> {selectedEvent.patientDni}</Typography></Grid>
                                <Grid item><Typography><strong>Fecha:</strong> {format(parseISO(selectedEvent.start), "P", { locale: fnsEsLocale })}</Typography></Grid>
                                <Grid item><Typography><strong>Hora:</strong> {format(parseISO(selectedEvent.start), "HH:mm", { locale: fnsEsLocale })} - {format(parseISO(selectedEvent.end), "HH:mm", { locale: fnsEsLocale })}</Typography></Grid>
                                <Grid item><Typography><strong>Email:</strong> {selectedEvent.patientEmail}</Typography></Grid>
                                <Grid item><Typography><strong>Teléfono:</strong> {selectedEvent.patientPhone}</Typography></Grid>
                                <Grid item>
                                    <Typography><strong>Motivo:</strong></Typography>
                                    <Typography paragraph sx={{ pl:1, fontStyle: 'italic', color: 'text.secondary', mb:1 }}>{selectedEvent.reasonForVisit || 'No especificado'}</Typography>
                                </Grid>
                                <Grid item>
                                    <TextField label="Notas del Profesional sobre el Turno" multiline rows={3} fullWidth variant="outlined" value={professionalNotesModal} onChange={(e) => setProfessionalNotesModal(e.target.value)} sx={{ my: 1 }}/>
                                    <Button onClick={handleSaveProfessionalNotes} size="small" disabled={modalActionLoading}>{modalActionLoading ? <CircularProgress size={20} /> : 'Guardar Notas'}</Button>
                                </Grid>
                                <Grid item sx={{mt:1}}>
                                    <FormControl fullWidth>
                                        <InputLabel id="status-select-label-modal">Cambiar Estado</InputLabel>
                                        <Select labelId="status-select-label-modal" value={selectedEvent.status} disabled={modalActionLoading} label="Cambiar Estado" onChange={handleChangeStatus}>
                                            {availableStatuses.map(statusKey => (<MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {isReprogramming && (
                                    <Grid item sx={{mt:2}}>
                                        <DateTimePicker
                                            label="Nueva Fecha y Hora para el Turno"
                                            value={newDateTimeForReprogram}
                                            onChange={(newValue) => setNewDateTimeForReprogram(newValue)}
                                            renderInput={(params) => <TextField {...params} fullWidth />}
                                            ampm={false}
                                            minDateTime={new Date()}
                                        />
                                    </Grid>
                                )}
                            </Grid>
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                                <Box>
                                    <Button variant="outlined" color={isReprogramming ? "primary" : "secondary"} onClick={handleToggleReprogramming} startIcon={<EditCalendarIcon />} sx={{ mr: 1, mb: {xs:1, sm:0} }}>{isReprogramming ? "Cancelar Reprogramación" : "Reprogramar"}</Button>
                                    {isReprogramming && (<Button variant="contained" onClick={handleConfirmReprogramming} disabled={!newDateTimeForReprogram} sx={{mb: {xs:1, sm:0}}}>Confirmar Reprog.</Button>)}
                                </Box>
                                <Box sx={{display: 'flex', gap:1}}>
                                    <Button onClick={handleOpenDeleteAppointmentModal} color="error" startIcon={<DeleteForeverIcon />}>Eliminar</Button>
                                    <Button onClick={handleCloseDetailModal} variant="outlined">Cerrar</Button>
                                </Box>
                            </Box>
                        </Box>
                    </Modal>
                )}

                <Dialog open={openNewAppointmentModal} onClose={handleCloseNewAppointmentModal} maxWidth="sm" fullWidth>
                    <DialogTitle>Añadir Turno Manualmente</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} direction="column" sx={{pt:1}}>
                            <Grid item xs={12}>
                                <Autocomplete
                                    options={existingPatients}
                                    getOptionLabel={(option) => `${option.fullName} (DNI: ${option.dni})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id}
                                    onChange={handleNewAppointmentPatientChange}
                                    value={newAppointmentData.patient}
                                    renderInput={(params) => (<TextField {...params} label="Buscar Paciente *" error={!!newAppointmentErrors.patient} helperText={newAppointmentErrors.patient} />)}
                                />
                                {!newAppointmentData.patient && (<Button size="small" startIcon={<PersonAddIcon />} onClick={handleOpenCreatePatientSubModal} sx={{ mt: 1 }}>Añadir Nuevo Paciente</Button>)}
                            </Grid>
                            <Grid item xs={12}>
                                <DateTimePicker
                                    label="Fecha y Hora del Turno *"
                                    value={newAppointmentData.dateTime}
                                    onChange={handleNewAppointmentDateChange}
                                    renderInput={(params) => <TextField {...params} fullWidth error={!!newAppointmentErrors.dateTime} helperText={newAppointmentErrors.dateTime} />}
                                    ampm={false}
                                    minDateTime={new Date()}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField name="reasonForVisit" label="Motivo de la Consulta (Opcional)" value={newAppointmentData.reasonForVisit} onChange={handleNewAppointmentChange} fullWidth multiline rows={3}/>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px'}}>
                        <Button onClick={handleCloseNewAppointmentModal}>Cancelar</Button>
                        <Button onClick={handleSaveNewAppointment} variant="contained">Guardar Turno</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openCreatePatientSubModal} onClose={handleCloseCreatePatientSubModal} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Añadir Nuevo Paciente</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>
                                {newPatientFormData.firstName || newPatientFormData.lastName ? getInitials(`${newPatientFormData.firstName} ${newPatientFormData.lastName}`) : <PersonAddIcon fontSize="large" />}
                            </Avatar>
                        </Box>
                        <Grid container spacing={2} direction="column">
                            <Grid item xs={12}><TextField autoFocus name="dni" label="DNI *" value={newPatientFormData.dni} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.dni} helperText={newPatientFormErrors.dni} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="lastName" label="Apellido *" value={newPatientFormData.lastName} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.lastName} helperText={newPatientFormErrors.lastName} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={newPatientFormData.firstName} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.firstName} helperText={newPatientFormErrors.firstName} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={newPatientFormData.email} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.email} helperText={newPatientFormErrors.email} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="phone" label="Teléfono" value={newPatientFormData.phone} onChange={handleNewPatientFormChange} fullWidth variant="outlined"/></Grid>
                            <Grid item xs={12}>
                                 <DatePicker
                                    label="Fecha de Nacimiento"
                                    value={newPatientFormData.birthDate}
                                    onChange={handleNewPatientFormDateChange}
                                    renderInput={(params) => <TextField {...params} fullWidth error={!!newPatientFormErrors.birthDate} helperText={newPatientFormErrors.birthDate} variant="outlined"/>}
                                    maxDate={new Date()}
                                    format="dd/MM/yyyy"
                                />
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}>
                        <Button onClick={handleCloseCreatePatientSubModal} color="inherit">Cancelar</Button>
                        <Button onClick={handleSaveNewPatientFromSubModal} variant="contained">Guardar Paciente</Button>
                    </DialogActions>
                </Dialog>

                <Dialog open={openDeleteAppointmentConfirmModal} onClose={handleCloseDeleteAppointmentModal}>
                    <DialogTitle>Confirmar Eliminación de Turno</DialogTitle>
                    <DialogContent>
                        <Typography>
                            ¿Está seguro de que desea eliminar el turno para <strong>{selectedEvent?.title}</strong> el día <strong>{selectedEvent ? format(parseISO(selectedEvent.start), "dd/MM/yyyy 'a las' HH:mm", { locale: fnsEsLocale }) : ''}</strong>? Esta acción no se puede deshacer.
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteAppointmentModal}>Cancelar</Button>
                        <Button onClick={handleConfirmDeleteAppointment} color="error" autoFocus>Eliminar</Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </LocalizationProvider>
    );
};

export default AppointmentsView;