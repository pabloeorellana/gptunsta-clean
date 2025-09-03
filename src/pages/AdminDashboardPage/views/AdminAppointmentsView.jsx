// src/pages/AdminDashboardPage/views/AdminAppointmentsView.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Box, Typography, Paper, Modal, Grid, Chip, Alert, CircularProgress,
    Button, FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle,
    DialogContent, DialogActions
} from '@mui/material';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import esLocale from '@fullcalendar/core/locales/es';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { LocalizationProvider, DateTimePicker } from '@mui/x-date-pickers';
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
    transform: 'translate(-50%, -50%)', width: { xs: '90%', sm: 600 },
    bgcolor: 'background.paper', border: '2px solid #000', boxShadow: 24, p: 4,
};

const AdminAppointmentsView = () => {
    const { showNotification } = useNotification();
    const calendarRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [openDetailModal, setOpenDetailModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
    const [isReprogramming, setIsReprogramming] = useState(false);
    const [newDateTimeForReprogram, setNewDateTimeForReprogram] = useState(null);

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
                title: `${appt.title} (Prof. ${appt.professionalName.split(' ')[0]})`,
                start: appt.start,
                end: appt.end,
                extendedProps: {
                    status: appt.status, reasonForVisit: appt.reasonForVisit,
                    patientDni: appt.patientDni, professionalName: appt.professionalName
                },
                backgroundColor: statusColors[appt.status]?.backgroundColor || '#757575',
                borderColor: statusColors[appt.status]?.borderColor || '#757575',
            }));
            setEvents(formattedEvents);
        } catch (err) {
            setError(err.message || "Error al cargar los turnos.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleEventClick = useCallback((clickInfo) => {
        const eventData = {
            id: clickInfo.event.id,
            title: clickInfo.event.title,
            start: clickInfo.event.startStr,
            end: clickInfo.event.endStr,
            ...clickInfo.event.extendedProps,
        };
        setSelectedEvent(eventData);
        setOpenDetailModal(true);
        setIsReprogramming(false);
    }, []);

    const handleCloseDetailModal = () => {
        setOpenDetailModal(false);
        setSelectedEvent(null);
    };

    const handleChangeStatus = async (event) => {
        const newStatus = event.target.value;
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/status`, {
                    method: 'PUT', body: JSON.stringify({ status: newStatus }),
                });
                showNotification('Estado del turno actualizado.', 'success');
                const calendarApi = calendarRef.current.getApi();
                calendarApi.refetchEvents();
                handleCloseDetailModal();
            } catch (err) { showNotification(`Error cambiando estado: ${err.message}`, 'error');}
        }
    };
    
    const handleConfirmDeleteAppointment = async () => {
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}`, { method: 'DELETE' });
                showNotification('Turno eliminado correctamente.', 'success');
                const calendarApi = calendarRef.current.getApi();
                calendarApi.refetchEvents();
                handleCloseDetailModal();
            } catch (err) {showNotification(`Error eliminando turno: ${err.message}`, 'error'); }
        }
        setOpenDeleteConfirmModal(false);
    };

    const handleConfirmReprogramming = async () => {
        if (selectedEvent && newDateTimeForReprogram) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/reprogram`, {
                    method: 'PUT', body: JSON.stringify({ newDateTime: newDateTimeForReprogram.toISOString() }),
                });
                showNotification('Turno reprogramado exitosamente.', 'success');
                const calendarApi = calendarRef.current.getApi();
                calendarApi.refetchEvents();
                handleCloseDetailModal();
            } catch (err) {showNotification(`Error reprogramando turno: ${err.message}`, 'error');}
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fnsEsLocale}>
            <Paper elevation={3} sx={{ p: {xs: 1, sm: 2, md: 3} }}>
                <Typography variant="h5" gutterBottom component="div" sx={{mb: 2}}>Agenda Global de Turnos</Typography>
                {error && <Alert severity="error" sx={{mb:2}}>{error}</Alert>}
                {loading && <Box sx={{display:'flex', justifyContent:'center', my:2}}><CircularProgress/></Box>}
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                    initialView="timeGridWeek"
                    locale={esLocale}
                    weekends={true}
                    events={events}
                    datesSet={(viewInfo) => fetchAppointments(viewInfo)}
                    eventClick={handleEventClick}
                    editable={false}
                    selectable={false} // Deshabilitar la selección de fechas para el admin
                    dayMaxEvents={true}
                    contentHeight="auto"
                    allDaySlot={false}
                />

                {selectedEvent && (
                    <Dialog open={openDetailModal} onClose={handleCloseDetailModal} maxWidth="sm" fullWidth>
                        <DialogTitle>Detalles del Turno</DialogTitle>
                        <DialogContent>
                            <Chip label={statusColors[selectedEvent.status]?.label || selectedEvent.status} style={{ backgroundColor: statusColors[selectedEvent.status]?.backgroundColor, color: statusColors[selectedEvent.status]?.color, marginBottom: 16 }}/>
                            <Grid container spacing={1.5} direction="column" sx={{ mt: 1 }}>
                                <Grid item><Typography><strong>Paciente:</strong> {selectedEvent.title}</Typography></Grid>
                                <Grid item><Typography><strong>DNI:</strong> {selectedEvent.patientDni}</Typography></Grid>
                                <Grid item><Typography><strong>Profesional:</strong> {selectedEvent.professionalName}</Typography></Grid>
                                <Grid item><Typography><strong>Fecha y Hora:</strong> {format(parseISO(selectedEvent.start), "dd/MM/yyyy HH:mm")}</Typography></Grid>
                                <Grid item><Typography><strong>Motivo:</strong> {selectedEvent.reasonForVisit || 'No especificado'}</Typography></Grid>
                                <Grid item sx={{mt:1}}>
                                    <FormControl fullWidth>
                                        <InputLabel>Cambiar Estado</InputLabel>
                                        <Select value={selectedEvent.status} label="Cambiar Estado" onChange={handleChangeStatus}>
                                            {availableStatuses.map(statusKey => (<MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                {isReprogramming && (
                                    <Grid item sx={{mt:2}}>
                                        <DateTimePicker
                                            label="Nueva Fecha y Hora"
                                            value={newDateTimeForReprogram}
                                            onChange={setNewDateTimeForReprogram}
                                            renderInput={(params) => <TextField {...params} fullWidth />}
                                            ampm={false}
                                            minDateTime={new Date()}
                                        />
                                    </Grid>
                                )}
                            </Grid>
                        </DialogContent>
                        <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            <Box>
                                <Button variant="outlined" color="secondary" onClick={() => setIsReprogramming(!isReprogramming)} sx={{mr:1}}>{isReprogramming ? 'Cancelar Reprog.' : 'Reprogramar'}</Button>
                                {isReprogramming && <Button variant="contained" onClick={handleConfirmReprogramming}>Confirmar</Button>}
                            </Box>
                            <Box>
                                <Button onClick={() => setOpenDeleteConfirmModal(true)} color="error">Eliminar</Button>
                                <Button onClick={handleCloseDetailModal} variant="outlined">Cerrar</Button>
                            </Box>
                        </DialogActions>
                    </Dialog>
                )}

                <Dialog open={openDeleteConfirmModal} onClose={() => setOpenDeleteConfirmModal(false)}>
                    <DialogTitle>Confirmar Eliminación</DialogTitle>
                    <DialogContent>
                        <Typography>¿Está seguro de que desea eliminar este turno? Esta acción no se puede deshacer.</Typography>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => setOpenDeleteConfirmModal(false)}>Cancelar</Button>
                        <Button onClick={handleConfirmDeleteAppointment} color="error">Eliminar</Button>
                    </DialogActions>
                </Dialog>
            </Paper>
        </LocalizationProvider>
    )
}

export default AdminAppointmentsView