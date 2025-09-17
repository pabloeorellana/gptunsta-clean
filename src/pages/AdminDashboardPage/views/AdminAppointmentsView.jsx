import React, { useState, useEffect, useCallback, useRef } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Box, Typography, Paper, Grid, Chip, Alert, CircularProgress,
    Button, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Autocomplete, Avatar, Stack, Divider, DialogContentText
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import EditCalendarIcon from '@mui/icons-material/EditCalendar';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { format, parseISO, startOfWeek, endOfWeek, setMilliseconds, setSeconds, setMinutes } from 'date-fns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useNotification } from '../../../context/NotificationContext';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

const statusColors = {
    SCHEDULED: { backgroundColor: '#536dfe', color: 'white', label: 'Programado' },
    CONFIRMED: { backgroundColor: '#2979ff', color: 'white', label: 'Confirmado' },
    COMPLETED: { backgroundColor: '#00c853', color: 'white', label: 'Completado' },
    CANCELED_PATIENT: { backgroundColor: '#ff5252', color: 'white', label: 'Cancelado (Pac.)' },
    CANCELED_PROFESSIONAL: { backgroundColor: '#d50000', color: 'white', label: 'Cancelado (Prof.)' },
    NO_SHOW: { backgroundColor: '#9e9e9e', color: 'white', label: 'No Asistió' },
};
const availableStatuses = Object.keys(statusColors);
const initialNewAppointmentState = { patient: null, professional: null, dateTime: null, reasonForVisit: '' };

const AdminAppointmentsView = () => {
    const { showNotification } = useNotification();
    const calendarRef = useRef(null);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [error, setError] = useState('');
    const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
    const [isReprogramming, setIsReprogramming] = useState(false);
    const [newDateTimeForReprogram, setNewDateTimeForReprogram] = useState(null);
    const [professionals, setProfessionals] = useState([]);
    const [patients, setPatients] = useState([]);
    const [selectedProfessionalFilter, setSelectedProfessionalFilter] = useState('ALL');
    const [openNewAppointmentModal, setOpenNewAppointmentModal] = useState(false);
    const [newAppointmentData, setNewAppointmentData] = useState(initialNewAppointmentState);
    const [newAppointmentErrors, setNewAppointmentErrors] = useState({});

    const getInitials = (name) => {
        if (!name) return '';
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const fetchInitialData = useCallback(async () => {
        try {
            const [usersData, patientsData] = await Promise.all([
                authFetch('/api/admin/users'),
                authFetch('/api/patients')
            ]);
            setProfessionals(usersData.filter(u => u.role === 'PROFESSIONAL'));
            setPatients(patientsData || []);
        } catch (err) {
            showNotification(err.message || 'Error al cargar datos iniciales', 'error');
        }
    }, [showNotification]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);
    
    const refreshAgenda = () => {
        if(calendarRef.current) calendarRef.current.getApi().refetchEvents();
    };
    
    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
        const startDate = format(fetchInfo.start, 'yyyy-MM-dd');
        const endDate = format(fetchInfo.end, 'yyyy-MM-dd');
        let url = `/api/appointments?startDate=${startDate}&endDate=${endDate}`;
        
        authFetch(url)
            .then(data => {
                const appointmentsData = Array.isArray(data) ? data : [];
                let formattedEvents = appointmentsData.map(appt => ({
                    id: String(appt.id),
                    title: `${appt.title}`, start: appt.start, end: appt.end,
                    extendedProps: {
                        status: appt.status, reasonForVisit: appt.reasonForVisit,
                        patientDni: appt.patientDni, professionalName: appt.professionalName,
                        patientId: appt.patientId
                    },
                    backgroundColor: statusColors[appt.status]?.backgroundColor || '#757575',
                    borderColor: statusColors[appt.status]?.backgroundColor || '#757575',
                    className: 'fc-event-custom'
                }));

                const professional = professionals.find(p => p.id === selectedProfessionalFilter);
                if (selectedProfessionalFilter !== 'ALL' && professional) {
                    formattedEvents = formattedEvents.filter(event => event.extendedProps.professionalName === professional.fullName);
                }

                successCallback(formattedEvents);
            })
            .catch(err => {
                showNotification(err.message || "Error al cargar los turnos.", 'error');
                failureCallback(err);
            });
    }, [selectedProfessionalFilter, professionals, showNotification]);

    useEffect(() => { refreshAgenda(); }, [selectedProfessionalFilter]);

    const handleEventClick = useCallback((clickInfo) => {
        const eventData = { ...clickInfo.event.extendedProps, id: clickInfo.event.id, title: clickInfo.event.title, start: clickInfo.event.startStr, end: clickInfo.event.endStr };
        setSelectedEvent(eventData);
        setIsReprogramming(false);
        setNewDateTimeForReprogram(null);
        setOpenDetailModal(true);
    }, []);

    const handleCloseDetailModal = () => { setOpenDetailModal(false); setSelectedEvent(null); };

    const handleChangeStatus = async (newStatus) => {
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/status`, { method: 'PUT', body: JSON.stringify({ status: newStatus }) });
                showNotification('Estado del turno actualizado.', 'success');
                refreshAgenda();
                handleCloseDetailModal();
            } catch (err) { showNotification(`Error cambiando estado: ${err.message}`, 'error');}
        }
    };
    
    const handleConfirmDeleteAppointment = async () => {
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}`, { method: 'DELETE' });
                showNotification('Turno eliminado correctamente.', 'success');
                refreshAgenda();
                handleCloseDetailModal();
            } catch (err) {showNotification(`Error eliminando turno: ${err.message}`, 'error'); }
        }
        setOpenDeleteConfirmModal(false);
    };

    const handleConfirmReprogramming = async () => {
        if (selectedEvent && newDateTimeForReprogram) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/reprogram`, { method: 'PUT', body: JSON.stringify({ newDateTime: newDateTimeForReprogram.toISOString() }) });
                showNotification('Turno reprogramado exitosamente.', 'success');
                refreshAgenda();
                handleCloseDetailModal();
            } catch (err) {showNotification(`Error reprogramando turno: ${err.message}`, 'error');}
        }
    };

    const handleDateSelect = (selectInfo) => {
        setNewAppointmentData({ ...initialNewAppointmentState, dateTime: selectInfo.start });
        setOpenNewAppointmentModal(true);
        let calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
    };

    const handleOpenNewAppointmentModal = () => setOpenNewAppointmentModal(true);
    const handleCloseNewAppointmentModal = () => {
        setOpenNewAppointmentModal(false); setNewAppointmentData(initialNewAppointmentState); setNewAppointmentErrors({});
    };

    const validateNewAppointmentForm = () => {
        const errors = {};
        if (!newAppointmentData.patient) errors.patient = 'Seleccione un paciente.';
        if (!newAppointmentData.professional) errors.professional = 'Seleccione un profesional.';
        if (!newAppointmentData.dateTime) errors.dateTime = 'Seleccione fecha y hora.';
        setNewAppointmentErrors(errors);
        return Object.keys(errors).length === 0;
    };
    
    const handleSaveNewAppointment = async () => {
        if (!validateNewAppointmentForm()) return;
        try {
            const { patient, professional, dateTime, reasonForVisit } = newAppointmentData;
            await authFetch('/api/appointments/manual', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Admin-Action-For-User': professional.id }, 
                body: JSON.stringify({
                    patientId: patient.id,
                    professionalUserId: professional.id,
                    dateTime: dateTime.toISOString(),
                    reasonForVisit
                })
            });
            showNotification('Turno creado exitosamente.', 'success');
            handleCloseNewAppointmentModal();
            refreshAgenda();
        } catch(err) {
            setNewAppointmentErrors(prev => ({...prev, form: err.message}));
            showNotification(err.message || "Error al crear el turno.", "error");
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fnsEsLocale}>
            <Paper elevation={3} sx={{ p: {xs: 1, sm: 2, md: 3} }}>
                <Stack direction={{xs: 'column', sm: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
                    <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>Agenda Global de Turnos</Typography>
                    <Stack direction="row" spacing={1}>
                        <FormControl size="small" sx={{minWidth: 220}}>
                            <InputLabel>Filtrar por Profesional</InputLabel>
                            <Select value={selectedProfessionalFilter} label="Filtrar por Profesional" onChange={(e) => setSelectedProfessionalFilter(e.target.value)}>
                                <MenuItem value="ALL">Todos los Profesionales</MenuItem>
                                {professionals.map(prof => (<MenuItem key={prof.id} value={prof.id}>{prof.fullName}</MenuItem>))}
                            </Select>
                        </FormControl>
                         <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={handleOpenNewAppointmentModal}>Añadir Turno</Button>
                    </Stack>
                </Stack>
                
                <style>{`.fc-event-custom { /* ... */ }`}</style>

                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                    initialView="timeGridWeek"
                    locale={esLocale}
                    weekends={true}
                    events={fetchEvents}
                    eventClick={handleEventClick}
                    dayMaxEvents={true}
                    contentHeight="auto"
                    allDaySlot={false}
                    selectable={true}
                    select={handleDateSelect}
                    eventDidMount={(info) => {
                        tippy(info.el, {
                            content: `<div style="padding:4px;"><div><strong>Paciente:</strong> ${info.event.title}</div><div><strong>Profesional:</strong> ${info.event.extendedProps.professionalName}</div></div>`,
                            allowHTML: true,
                        });
                    }}
                />

                {selectedEvent && (
                    <Dialog open={openDetailModal} onClose={handleCloseDetailModal} maxWidth="sm" fullWidth>
                        <DialogTitle sx={{ pb: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>{getInitials(selectedEvent.title)}</Avatar>
                            <Box>
                                <Typography variant="h6" component="div">{selectedEvent.title}</Typography>
                                <Chip label={statusColors[selectedEvent.status]?.label || selectedEvent.status} sx={{ backgroundColor: statusColors[selectedEvent.status]?.backgroundColor, color: statusColors[selectedEvent.status]?.color }} size="small"/>
                            </Box>
                        </DialogTitle>
                        <DialogContent><Divider sx={{ my: 1 }} />
                            {isReprogramming ? (
                                <Box sx={{py: 2}}><Typography variant="h6" gutterBottom>Reprogramar Turno</Typography><DateTimePicker label="Nueva Fecha y Hora" value={newDateTimeForReprogram || parseISO(selectedEvent.start)} onChange={setNewDateTimeForReprogram} renderInput={(params) => <TextField {...params} fullWidth sx={{mt: 2}}/>} ampm={false} minDateTime={new Date()} /></Box>
                            ) : (
                                <Stack spacing={2} sx={{pt: 2}}>
                                    <Typography><strong>DNI:</strong> {selectedEvent.patientDni}</Typography>
                                    <Typography><strong>Profesional Asignado:</strong> {selectedEvent.professionalName}</Typography>
                                    <Typography><strong>Fecha y Hora:</strong> {format(parseISO(selectedEvent.start), "dd/MM/yyyy 'a las' HH:mm 'hs.'")}</Typography>
                                    <Box><Typography><strong>Motivo:</strong></Typography><Typography paragraph sx={{ pl:1, fontStyle: 'italic', color: 'text.secondary', mb:0 }}>{selectedEvent.reasonForVisit || 'No especificado'}</Typography></Box>
                                    <FormControl fullWidth><InputLabel>Cambiar Estado</InputLabel><Select value={selectedEvent.status} label="Cambiar Estado" onChange={(e) => handleChangeStatus(e.target.value)}>{availableStatuses.map(statusKey => (<MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>))}</Select></FormControl>
                                </Stack>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            {isReprogramming ? (
                                <Stack direction="row" spacing={1} sx={{width: '100%', justifyContent: 'flex-end'}}><Button onClick={() => setIsReprogramming(false)} variant="outlined">Cancelar</Button><Button onClick={handleConfirmReprogramming} variant="contained" disabled={!newDateTimeForReprogram}>Confirmar</Button></Stack>
                            ) : (
                                <><Button variant="outlined" startIcon={<EditCalendarIcon />} onClick={() => setIsReprogramming(true)}>Reprogramar</Button><Stack direction="row" spacing={1}><Button onClick={() => setOpenDeleteConfirmModal(true)} color="error">Eliminar</Button><Button onClick={handleCloseDetailModal}>Cerrar</Button></Stack></>
                            )}
                        </DialogActions>
                    </Dialog>
                )}

                <Dialog open={openNewAppointmentModal} onClose={handleCloseNewAppointmentModal} maxWidth="sm" fullWidth>
                    <DialogTitle>Añadir Turno Global</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} direction="column" sx={{pt:1}}>
                            <Grid item xs={12}><Autocomplete options={patients} getOptionLabel={(option) => `${option.fullName} (DNI: ${option.dni})`} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, val) => setNewAppointmentData(p => ({...p, patient: val}))} value={newAppointmentData.patient} renderInput={(params) => (<TextField {...params} label="Buscar Paciente *" error={!!newAppointmentErrors.patient} helperText={newAppointmentErrors.patient} />)} /></Grid>
                            <Grid item xs={12}><Autocomplete options={professionals} getOptionLabel={(option) => option.fullName} isOptionEqualToValue={(o, v) => o.id === v.id} onChange={(e, val) => setNewAppointmentData(p => ({...p, professional: val}))} value={newAppointmentData.professional} renderInput={(params) => (<TextField {...params} label="Asignar a Profesional *" error={!!newAppointmentErrors.professional} helperText={newAppointmentErrors.professional} />)} /></Grid>
                            <Grid item xs={12}><DateTimePicker label="Fecha y Hora del Turno *" value={newAppointmentData.dateTime} onChange={(val) => setNewAppointmentData(p => ({...p, dateTime: val}))} renderInput={(params) => <TextField {...params} fullWidth error={!!newAppointmentErrors.dateTime} helperText={newAppointmentErrors.dateTime} />} ampm={false} minDateTime={new Date()} /></Grid>
                            <Grid item xs={12}><TextField name="reasonForVisit" label="Motivo de la Consulta (Opcional)" value={newAppointmentData.reasonForVisit} onChange={(e) => setNewAppointmentData(p => ({...p, reasonForVisit: e.target.value}))} fullWidth multiline rows={3}/></Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px'}}><Button onClick={handleCloseNewAppointmentModal}>Cancelar</Button><Button onClick={handleSaveNewAppointment} variant="contained">Guardar Turno</Button></DialogActions>
                </Dialog>

                <Dialog open={openDeleteConfirmModal} onClose={() => setOpenDeleteConfirmModal(false)}>
                    <DialogTitle>Confirmar Eliminación</DialogTitle><DialogContent><DialogContentText>¿Está seguro de que desea eliminar este turno? Esta acción no se puede deshacer.</DialogContentText></DialogContent>
                    <DialogActions><Button onClick={() => setOpenDeleteConfirmModal(false)}>Cancelar</Button><Button onClick={handleConfirmDeleteAppointment} color="error">Eliminar</Button></DialogActions>
                </Dialog>
            </Paper>
        </LocalizationProvider>
    )
}

export default AdminAppointmentsView;