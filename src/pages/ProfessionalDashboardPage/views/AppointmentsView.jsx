import React, { useState, useEffect, useCallback, useRef } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Typography, Paper, Box, Button, Chip, Grid, TextField,
    Select, MenuItem, FormControl, InputLabel, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, Autocomplete, Alert,
    Avatar, Tooltip, Stack, CircularProgress, Divider, DialogContentText
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
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { format, parseISO, setMinutes, setSeconds, setMilliseconds, startOfWeek, endOfWeek } from 'date-fns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { LocalizationProvider, DateTimePicker, DatePicker } from '@mui/x-date-pickers';
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
const initialNewAppointmentState = { patient: null, dateTime: null, reasonForVisit: '' };
const initialNewPatientFormDataState = { dni: '', lastName: '', firstName: '', email: '', phone: '', birthDate: null };
const initialClinicalRecordState = { title: '', content: '', pathology: '', attachment: null };

const AppointmentsView = () => {
    const [existingPatients, setExistingPatients] = useState([]);
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
    const calendarRef = useRef(null);
    const { showNotification } = useNotification();
    const [modalActionLoading, setModalActionLoading] = useState(false);
    const [openClinicalRecordModal, setOpenClinicalRecordModal] = useState(false);
    const [currentClinicalRecord, setCurrentClinicalRecord] = useState(initialClinicalRecordState);
    const [pathologies, setPathologies] = useState([]);
    const [isSavingRecord, setIsSavingRecord] = useState(false);

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '';
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const fetchInitialData = useCallback(async () => {
        try {
            const [patientsData, pathologiesData] = await Promise.all([
                authFetch('/api/patients'),
                authFetch('/api/catalogs/pathologies')
            ]);
            const formattedPatients = (patientsData || []).map(p => ({...p, fullName: p.fullName || `${p.firstName} ${p.lastName}`.trim()}));
            setExistingPatients(formattedPatients);
            setPathologies(pathologiesData || []);
        } catch (err) { showNotification(err.message || "Error al cargar datos iniciales.", 'error'); }
    }, [showNotification]);

    useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

    const refreshAgenda = () => {
        if(calendarRef.current) {
            calendarRef.current.getApi().refetchEvents();
        }
    };

    const fetchEvents = useCallback((fetchInfo, successCallback, failureCallback) => {
        const startDate = format(fetchInfo.start, 'yyyy-MM-dd');
        const endDate = format(fetchInfo.end, 'yyyy-MM-dd');

        authFetch(`/api/appointments?startDate=${startDate}&endDate=${endDate}`)
            .then(data => {
                const appointmentsData = Array.isArray(data) ? data : [];
                let formattedEvents = appointmentsData.map(appt => ({
                    id: String(appt.id), title: appt.title, start: appt.start, end: appt.end,
                    extendedProps: {
                        status: appt.status, reasonForVisit: appt.reasonForVisit,
                        professionalNotes: appt.professionalNotes || '', patientId: appt.patientId,
                        patientDni: appt.patientDni, patientEmail: appt.patientEmail,
                        patientPhone: appt.patientPhone
                    },
                    backgroundColor: statusColors[appt.status]?.backgroundColor || '#757575',
                    borderColor: statusColors[appt.status]?.backgroundColor || '#757575',
                    className: 'fc-event-custom'
                }));

                if (statusFilter !== 'ALL') {
                    formattedEvents = formattedEvents.filter(event => event.extendedProps.status === statusFilter);
                }
                
                successCallback(formattedEvents);
            })
            .catch(err => {
                showNotification(err.message || "Error al cargar los turnos.", 'error');
                failureCallback(err);
            });
    }, [statusFilter, showNotification]);

    useEffect(() => {
        refreshAgenda();
    }, [statusFilter]);

    const handleEventClick = useCallback((clickInfo) => {
        const eventData = { ...clickInfo.event.extendedProps, id: clickInfo.event.id, title: clickInfo.event.title, start: clickInfo.event.startStr, end: clickInfo.event.endStr };
        setSelectedEvent(eventData);
        setProfessionalNotesModal(eventData.professionalNotes || '');
        setIsReprogramming(false);
        setNewDateTimeForReprogram(null);
        setOpenDetailModal(true);
    }, []);

    const handleCloseDetailModal = () => {
        setOpenDetailModal(false); setSelectedEvent(null); setIsReprogramming(false);
    };

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

    const handleSaveProfessionalNotes = async () => {
        if (selectedEvent) {
            setModalActionLoading(true);
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/notes`, { method: 'PUT', body: JSON.stringify({ professionalNotes: professionalNotesModal }) });
                showNotification("Notas guardadas exitosamente.", "success");
                refreshAgenda();
                setSelectedEvent(prev => ({...prev, professionalNotes: professionalNotesModal}));
            } catch (err) {showNotification(`Error al guardar notas: ${err.message}`, "error");}
            finally { setModalActionLoading(false); }
        }
    };

    const handleOpenAttendPatientModal = () => {
        setCurrentClinicalRecord({ ...initialClinicalRecordState, title: selectedEvent.reasonForVisit || '' });
        setOpenDetailModal(false);
        setOpenClinicalRecordModal(true);
    };

    const handleCloseClinicalRecordModal = () => {
        setOpenClinicalRecordModal(false);
        setCurrentClinicalRecord(initialClinicalRecordState);
    };

    const handleClinicalRecordInputChange = (event) => {
        const { name, value } = event.target;
        setCurrentClinicalRecord(prev => ({...prev, [name]: value}));
    };

    const handleAttachmentChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            setCurrentClinicalRecord(prev => ({ ...prev, attachment: event.target.files[0] }));
        }
    };

    const handleSaveClinicalRecordAndComplete = async () => {
        if (!currentClinicalRecord.content.trim()) {
            showNotification('El campo de detalles es obligatorio.', 'error');
            return;
        }
        setIsSavingRecord(true);
        try {
            let uploadedFilePath = '', uploadedFileName = '';
            if (currentClinicalRecord.attachment) {
                const formData = new FormData();
                formData.append('attachment', currentClinicalRecord.attachment);
                const uploadResponse = await authFetch('/api/clinical-records/upload', { method: 'POST', body: formData });
                uploadedFilePath = uploadResponse.filePath;
                uploadedFileName = currentClinicalRecord.attachment.name;
            }
            const recordPayload = {
                title: currentClinicalRecord.title, content: currentClinicalRecord.content,
                pathology: currentClinicalRecord.pathology, attachmentName: uploadedFileName,
                attachmentPath: uploadedFilePath,
            };
            await authFetch(`/api/patients/${selectedEvent.patientId}/clinical-records`, { method: 'POST', body: JSON.stringify(recordPayload) });
            await authFetch(`/api/appointments/${selectedEvent.id}/status`, { method: 'PUT', body: JSON.stringify({ status: 'COMPLETED' }) });
            showNotification('Atención registrada y turno completado.', 'success');
            handleCloseClinicalRecordModal();
            refreshAgenda();
        } catch (err) {
            showNotification(err.message || 'Error al guardar la atención.', 'error');
        } finally { setIsSavingRecord(false); }
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
                const roundedMinutes = Math.floor(minutes / 30) * 30;
                newValue = setMilliseconds(setSeconds(setMinutes(newValue, roundedMinutes),0),0);
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
        try {
            const { patient, dateTime, reasonForVisit } = newAppointmentData;
            await authFetch('/api/appointments/manual', { method: 'POST', body: JSON.stringify({ patientId: patient.id, dateTime: dateTime.toISOString(), reasonForVisit }) });
            showNotification('Turno manual creado exitosamente.', 'success');
            handleCloseNewAppointmentModal();
            refreshAgenda();
        } catch (err) {
            setNewAppointmentErrors(prev => ({ ...prev, form: err.message }));
            showNotification(err.message || 'Error al crear el turno.', 'error');
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
        const newPatientPayload = { ...newPatientFormData, birthDate: newPatientFormData.birthDate ? format(newPatientFormData.birthDate, 'yyyy-MM-dd') : null };
        try {
            const savedPatient = await authFetch('/api/patients', { method: 'POST', body: JSON.stringify(newPatientPayload) });
            if(savedPatient){
                const patientWithFullName = {...savedPatient, fullName: `${savedPatient.firstName || ''} ${savedPatient.lastName || ''}`.trim()};
                setExistingPatients(prev => [...prev, patientWithFullName]);
                setNewAppointmentData(prev => ({ ...prev, patient: patientWithFullName }));
                showNotification(`Paciente ${patientWithFullName.fullName} creado exitosamente.`, 'success');
            }
            handleCloseCreatePatientSubModal();
        } catch (err) {
            setNewPatientFormErrors(prev => ({...prev, form: err.message}));
            showNotification(err.message, 'error');
        }
    };

    const handleDateSelect = (selectInfo) => {
        setNewAppointmentData({ ...initialNewAppointmentState, dateTime: selectInfo.start });
        setOpenNewAppointmentModal(true);
        let calendarApi = selectInfo.view.calendar;
        calendarApi.unselect();
    };

    const handleOpenDeleteAppointmentModal = () => setOpenDeleteAppointmentConfirmModal(true);
    const handleCloseDeleteAppointmentModal = () => setOpenDeleteAppointmentConfirmModal(false);

    const handleConfirmDeleteAppointment = async () => {
        if (selectedEvent) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}`, { method: 'DELETE' });
                showNotification('Turno eliminado correctamente.', 'success');
                handleCloseDeleteAppointmentModal();
                handleCloseDetailModal();
                refreshAgenda();
            } catch (err) {showNotification(`Error eliminando turno: ${err.message}`, 'error'); }
        }
    };

    const handleToggleReprogramming = () => {
        setIsReprogramming(prev => !prev);
    };

    const handleConfirmReprogramming = async () => {
        if (selectedEvent && newDateTimeForReprogram) {
            try {
                await authFetch(`/api/appointments/${selectedEvent.id}/reprogram`, { method: 'PUT', body: JSON.stringify({ newDateTime: newDateTimeForReprogram.toISOString() }) });
                showNotification('Turno reprogramado exitosamente.', 'success');
                handleCloseDetailModal();
                refreshAgenda();
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
                
                <style>{`.fc-event-custom { border-radius: 6px !important; padding: 4px 6px !important; font-weight: 500 !important; cursor: pointer; } .fc .fc-toolbar-title { font-size: 1.5em; color: #194da0; } .fc .fc-button-primary { background-color: #194da0 !important; border-color: #194da0 !important; } .fc .fc-button-primary:not(:disabled).fc-button-active, .fc .fc-button-primary:not(:disabled):active { background-color: #2e5ec0 !important; border-color: #2e5ec0 !important; } .fc-daygrid-day.fc-day-today { background-color: rgba(25, 118, 210, 0.1) !important; } .tippy-box { border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }`}</style>
                
                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek' }}
                    buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Agenda' }}
                    initialView="timeGridWeek"
                    locale={esLocale}
                    events={fetchEvents}
                    eventClick={handleEventClick}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    select={handleDateSelect}
                    contentHeight="auto"
                    allDaySlot={false}
                    slotMinTime="07:00:00"
                    slotMaxTime="22:00:00"
                    nowIndicator={true}
                    eventDidMount={(info) => {
                        tippy(info.el, {
                            content: `<div style="padding:4px;"><div><strong>Paciente:</strong> ${info.event.title}</div><div><strong>DNI:</strong> ${info.event.extendedProps.patientDni}</div><div style="white-space: pre-wrap;"><strong>Motivo:</strong> ${info.event.extendedProps.reasonForVisit || 'N/A'}</div></div>`,
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
                        <DialogContent>
                            <Divider sx={{ my: 1 }} />
                            {isReprogramming ? (
                                <Box sx={{py: 2}}>
                                    <Typography variant="h6" gutterBottom>Reprogramar Turno</Typography>
                                    <DateTimePicker
                                        label="Nueva Fecha y Hora"
                                        value={newDateTimeForReprogram || parseISO(selectedEvent.start)}
                                        onChange={setNewDateTimeForReprogram}
                                        renderInput={(params) => <TextField {...params} fullWidth sx={{mt: 2}}/>}
                                        ampm={false} minDateTime={new Date()}
                                    />
                                </Box>
                            ) : (
                                <Stack spacing={2} sx={{pt: 2}}>
                                    <Typography><strong>DNI:</strong> {selectedEvent.patientDni}</Typography>
                                    <Typography><strong>Teléfono:</strong> {selectedEvent.patientPhone || 'N/A'}</Typography>
                                    <Typography><strong>Email:</strong> {selectedEvent.patientEmail}</Typography>
                                    <Typography><strong>Fecha y Hora:</strong> {format(parseISO(selectedEvent.start), "dd/MM/yyyy 'a las' HH:mm 'hs.'")}</Typography>
                                    <Box>
                                        <Typography><strong>Motivo de la consulta:</strong></Typography>
                                        <Typography paragraph sx={{ pl:1, fontStyle: 'italic', color: 'text.secondary', mb:0 }}>{selectedEvent.reasonForVisit || 'No especificado'}</Typography>
                                    </Box>
                                    <Box>
                                        <TextField label="Notas del Profesional" multiline rows={3} fullWidth variant="outlined" value={professionalNotesModal} onChange={(e) => setProfessionalNotesModal(e.target.value)} sx={{ mt: 1 }}/>
                                        <Button onClick={handleSaveProfessionalNotes} size="small" disabled={modalActionLoading} sx={{mt: 1}}>{modalActionLoading ? <CircularProgress size={20} /> : 'Guardar Notas'}</Button>
                                    </Box>
                                    <FormControl fullWidth>
                                        <InputLabel>Cambiar Estado</InputLabel>
                                        <Select value={selectedEvent.status} label="Cambiar Estado" onChange={(e) => handleChangeStatus(e.target.value)}>
                                            {availableStatuses.map(statusKey => (<MenuItem key={statusKey} value={statusKey}>{statusColors[statusKey]?.label}</MenuItem>))}
                                        </Select>
                                    </FormControl>
                                </Stack>
                            )}
                        </DialogContent>
                        <DialogActions sx={{ p: '16px 24px', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                            {isReprogramming ? (
                                <Stack direction="row" spacing={1} sx={{width: '100%', justifyContent: 'flex-end'}}>
                                    <Button onClick={handleToggleReprogramming} variant="outlined">Cancelar</Button>
                                    <Button onClick={handleConfirmReprogramming} variant="contained" disabled={!newDateTimeForReprogram}>Confirmar Reprogramación</Button>
                                </Stack>
                            ) : (
                                <>
                                    <Stack direction="row" spacing={1}>
                                        <Button variant="contained" color="success" startIcon={<MedicalServicesIcon />} onClick={handleOpenAttendPatientModal} disabled={selectedEvent.status === 'COMPLETED' || selectedEvent.status.startsWith('CANCELED')}>Atender</Button>
                                        <Button variant="outlined" startIcon={<EditCalendarIcon />} onClick={handleToggleReprogramming}>Reprogramar</Button>
                                    </Stack>
                                    <Stack direction="row" spacing={1}>
                                        <Button onClick={handleOpenDeleteAppointmentModal} color="error">Eliminar</Button>
                                        <Button onClick={handleCloseDetailModal}>Cerrar</Button>
                                    </Stack>
                                </>
                            )}
                        </DialogActions>
                    </Dialog>
                )}
                <Dialog open={openClinicalRecordModal} onClose={handleCloseClinicalRecordModal} maxWidth="md" fullWidth>
                    <DialogTitle>Nueva Entrada en Historia Clínica para {selectedEvent?.title}</DialogTitle>
                    <DialogContent>
                        <DialogContentText sx={{mb: 2}}>Al guardar esta entrada, el turno se marcará como "Completado".</DialogContentText>
                        <Grid container spacing={2} direction="column" sx={{pt:1}}>
                            <Grid item xs={12}><TextField autoFocus margin="dense" name="title" label="Motivo de la consulta/Asunto" type="text" fullWidth value={currentClinicalRecord.title} onChange={handleClinicalRecordInputChange}/></Grid>
                            <Grid item xs={12}><FormControl fullWidth margin="dense"><InputLabel>Patología Asociada (Opcional)</InputLabel><Select name="pathology" value={currentClinicalRecord.pathology} label="Patología Asociada (Opcional)" onChange={handleClinicalRecordInputChange}><MenuItem value=""><em>Ninguna</em></MenuItem>{pathologies.map((p) => (<MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>))}</Select></FormControl></Grid>
                            <Grid item xs={12}><TextField margin="dense" name="content" label="Detalles de la Atención *" type="text" fullWidth multiline rows={8} value={currentClinicalRecord.content} onChange={handleClinicalRecordInputChange} required /></Grid>
                            <Grid item xs={12}>
                                <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} fullWidth sx={{textTransform: 'none', mt:1}}>
                                    {currentClinicalRecord.attachment ? 'Cambiar Archivo' : 'Adjuntar Archivo'}
                                    <input type="file" hidden onChange={handleAttachmentChange} accept=".pdf,.jpg,.jpeg,.png,.gif"/>
                                </Button>
                                <Typography variant="caption" display="block" sx={{mt:1, textAlign: 'center', color: 'text.secondary'}}>{currentClinicalRecord.attachment ? `Nuevo: ${currentClinicalRecord.attachment.name}` : 'Ningún archivo seleccionado.'}</Typography>
                            </Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px'}}><Button onClick={handleCloseClinicalRecordModal} disabled={isSavingRecord}>Cancelar</Button><Button onClick={handleSaveClinicalRecordAndComplete} variant="contained" disabled={isSavingRecord}>{isSavingRecord ? <CircularProgress size={24}/> : 'Guardar y Completar'}</Button></DialogActions>
                </Dialog>
                <Dialog open={openNewAppointmentModal} onClose={handleCloseNewAppointmentModal} maxWidth="sm" fullWidth>
                    <DialogTitle>Añadir Turno Manualmente</DialogTitle>
                    <DialogContent>
                        <Grid container spacing={2} direction="column" sx={{pt:1}}>
                            <Grid item xs={12}>
                                <Autocomplete
                                    options={existingPatients} getOptionLabel={(option) => `${option.fullName} (DNI: ${option.dni})`}
                                    isOptionEqualToValue={(option, value) => option.id === value.id} onChange={handleNewAppointmentPatientChange}
                                    value={newAppointmentData.patient}
                                    renderInput={(params) => (<TextField {...params} label="Buscar Paciente *" error={!!newAppointmentErrors.patient} helperText={newAppointmentErrors.patient} />)}
                                />
                                {!newAppointmentData.patient && (<Button size="small" startIcon={<PersonAddIcon />} onClick={handleOpenCreatePatientSubModal} sx={{ mt: 1 }}>Añadir Nuevo Paciente</Button>)}
                            </Grid>
                            <Grid item xs={12}><DateTimePicker label="Fecha y Hora del Turno *" value={newAppointmentData.dateTime} onChange={handleNewAppointmentDateChange} renderInput={(params) => <TextField {...params} fullWidth error={!!newAppointmentErrors.dateTime} helperText={newAppointmentErrors.dateTime} />} ampm={false} minDateTime={new Date()} /></Grid>
                            <Grid item xs={12}><TextField name="reasonForVisit" label="Motivo de la Consulta (Opcional)" value={newAppointmentData.reasonForVisit} onChange={handleNewAppointmentChange} fullWidth multiline rows={3}/></Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px'}}><Button onClick={handleCloseNewAppointmentModal}>Cancelar</Button><Button onClick={handleSaveNewAppointment} variant="contained">Guardar Turno</Button></DialogActions>
                </Dialog>
                <Dialog open={openCreatePatientSubModal} onClose={handleCloseCreatePatientSubModal} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Añadir Nuevo Paciente</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}><Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>{getInitials(`${newPatientFormData.firstName} ${newPatientFormData.lastName}`)}</Avatar></Box>
                        <Grid container spacing={2} direction="column">
                            <Grid item xs={12}><TextField autoFocus name="dni" label="DNI *" value={newPatientFormData.dni} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.dni} helperText={newPatientFormErrors.dni} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="lastName" label="Apellido *" value={newPatientFormData.lastName} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.lastName} helperText={newPatientFormErrors.lastName} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={newPatientFormData.firstName} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.firstName} helperText={newPatientFormErrors.firstName} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={newPatientFormData.email} onChange={handleNewPatientFormChange} fullWidth error={!!newPatientFormErrors.email} helperText={newPatientFormErrors.email} variant="outlined"/></Grid>
                            <Grid item xs={12}><TextField name="phone" label="Teléfono" value={newPatientFormData.phone} onChange={handleNewPatientFormChange} fullWidth variant="outlined"/></Grid>
                            <Grid item xs={12}><DatePicker label="Fecha de Nacimiento" value={newPatientFormData.birthDate} onChange={handleNewPatientFormDateChange} renderInput={(params) => <TextField {...params} fullWidth variant="outlined"/>} maxDate={new Date()} format="dd/MM/yyyy"/></Grid>
                        </Grid>
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}><Button onClick={handleCloseCreatePatientSubModal} color="inherit">Cancelar</Button><Button onClick={handleSaveNewPatientFromSubModal} variant="contained">Guardar Paciente</Button></DialogActions>
                </Dialog>
                <Dialog open={openDeleteAppointmentConfirmModal} onClose={handleCloseDeleteAppointmentModal}>
                    <DialogTitle>Confirmar Eliminación</DialogTitle><DialogContent><Typography>¿Está seguro de que desea eliminar el turno para <strong>{selectedEvent?.title}</strong> el día <strong>{selectedEvent ? format(parseISO(selectedEvent.start), "dd/MM/yyyy 'a las' HH:mm", { locale: fnsEsLocale }) : ''}</strong>? Esta acción no se puede deshacer.</Typography></DialogContent>
                    <DialogActions><Button onClick={handleCloseDeleteAppointmentModal}>Cancelar</Button><Button onClick={handleConfirmDeleteAppointment} color="error" autoFocus>Eliminar</Button></DialogActions>
                </Dialog>
            </Paper>
        </LocalizationProvider>
    );
};

export default AppointmentsView;