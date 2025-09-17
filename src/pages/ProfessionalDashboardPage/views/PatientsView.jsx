// En: src/pages/ProfessionalDashboardPage/views/PatientsView.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Box, Typography, Paper, TextField, List, ListItem, ListItemButton,
    ListItemText, Divider, Button, Grid, Dialog, DialogTitle,
    DialogContent, DialogActions, CircularProgress, IconButton, Avatar, Stack,
    ListItemIcon, Tooltip, Select, MenuItem,
    FormControl, InputLabel, Chip, DialogContentText, Alert,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButtonGroup, ToggleButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditNoteIcon from '@mui/icons-material/EditNote';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import DownloadIcon from '@mui/icons-material/Download';
import { format, parseISO, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config';

const initialNewPatientState = { dni: '', lastName: '', firstName: '', email: '', phone: '', birthDate: null };
const initialClinicalRecordState = { id: null, title: '', content: '', pathology: '', attachment: null, attachmentName: '', attachmentPath: '' };

const PatientsView = () => {
    const { showNotification } = useNotification();
    const { authUser } = useAuth();
    const [patients, setPatients] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [clinicalRecords, setClinicalRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [loadingRecords, setLoadingRecords] = useState(false); 
    const [showArchived, setShowArchived] = useState(false);
    const [pathologies, setPathologies] = useState([]);

    const [openAddPatientModal, setOpenAddPatientModal] = useState(false);
    const [newPatientData, setNewPatientData] = useState(initialNewPatientState);
    const [newPatientErrors, setNewPatientErrors] = useState({});
    const [openEditPatientModal, setOpenEditPatientModal] = useState(false);
    const [editingPatientData, setEditingPatientData] = useState(null);
    const [patientForValidation, setPatientForValidation] = useState(null);
    const [editingPatientErrors, setEditingPatientErrors] = useState({});
    const [openTogglePatientStatusConfirmModal, setOpenTogglePatientStatusConfirmModal] = useState(false);
    const [patientToToggle, setPatientToToggle] = useState(null);

    const [openRecordFormModal, setOpenRecordFormModal] = useState(false);
    const [currentRecordForm, setCurrentRecordForm] = useState(initialClinicalRecordState);
    const [isEditingRecordForm, setIsEditingRecordForm] = useState(false);
    const [openViewRecordModal, setOpenViewRecordModal] = useState(false);
    const [recordToView, setRecordToView] = useState(null);
    const [openDeleteRecordConfirmModal, setOpenDeleteRecordConfirmModal] = useState(false);
    const [recordToDeleteId, setRecordToDeleteId] = useState(null);
    const [isSavingRecord, setIsSavingRecord] = useState(false);

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '';
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [patientsData, pathologiesData] = await Promise.all([
                authFetch('/api/patients'),
                authFetch('/api/catalogs/pathologies') 
            ]);
            
            const processedPatients = (patientsData || []).map(p => ({
                ...p, fullName: p.fullName || `${p.firstName || ''} ${p.lastName || ''}`.trim(),
            }));
            
            setPatients(processedPatients);
            setPathologies(pathologiesData || []); 

        } catch (err) {
            setError(err.message || "Error al cargar los datos iniciales.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    const fetchClinicalRecords = useCallback(async (patientId) => {
        setLoadingRecords(true);
        setError(null);
        try {
            const records = await authFetch(`/api/patients/${patientId}/clinical-records`);
            setClinicalRecords(records.sort((a, b) => new Date(b.entryDate) - new Date(a.entryDate)) || []);
        } catch (err) {
            showNotification(err.message || "Error al cargar la historia clínica.", 'error');
            setError(err.message || "Error al cargar la historia clínica.");
        } finally {
            setLoadingRecords(false);
        }
    }, [showNotification]);

    useEffect(() => {
        if (selectedPatient?.id) {
            fetchClinicalRecords(selectedPatient.id);
        } else {
            setClinicalRecords([]);
        }
    }, [selectedPatient, fetchClinicalRecords]);

    const filteredPatientsForTable = useMemo(() => {
        return patients.filter(p => !!p.isActive === !showArchived);
    }, [patients, showArchived]);

    const patientTableColumns = useMemo(() => [
        { accessorKey: 'dni', header: 'DNI' },
        { accessorKey: 'lastName', header: 'Apellido' },
        { accessorKey: 'firstName', header: 'Nombre' },
        { accessorKey: 'phone', header: 'Teléfono', Cell: ({ cell }) => cell.getValue() || 'N/A' },
        { accessorKey: 'email', header: 'Correo Electrónico' },
        {
            accessorKey: 'lastAppointment',
            header: 'Última Consulta',
            Cell: ({ cell }) => {
                const date = cell.getValue();
                return date && isValid(parseISO(date)) ? format(parseISO(date), 'dd/MM/yyyy') : 'N/A';
            }
        },
    ], []);
    
    const handleSaveRecord = async () => {
        setIsSavingRecord(true);
        let uploadedFilePath = currentRecordForm.attachmentPath || '';
        let uploadedFileName = currentRecordForm.attachmentName || '';
    
        try {
            if (currentRecordForm.attachment) {
                const formData = new FormData();
                formData.append('attachment', currentRecordForm.attachment);
    
                const uploadResponse = await authFetch('/api/clinical-records/upload', {
                    method: 'POST',
                    body: formData,
                });
    
                if (!uploadResponse.filePath) {
                    throw new Error("La subida del archivo falló, no se recibió la ruta.");
                }
                uploadedFilePath = uploadResponse.filePath;
                uploadedFileName = currentRecordForm.attachment.name;
            }
    
            const recordPayload = {
                title: currentRecordForm.title,
                content: currentRecordForm.content,
                pathology: currentRecordForm.pathology,
                attachmentName: uploadedFileName,
                attachmentPath: uploadedFilePath.replace(/\\/g, '/'), 
            };
    
            if (isEditingRecordForm) {
                await authFetch(`/api/clinical-records/${currentRecordForm.id}`, { method: 'PUT', body: JSON.stringify(recordPayload) });
            } else {
                await authFetch(`/api/patients/${selectedPatient.id}/clinical-records`, { method: 'POST', body: JSON.stringify(recordPayload) });
            }
    
            fetchClinicalRecords(selectedPatient.id);
            handleCloseRecordFormModal();
            showNotification('Registro de historia clínica guardado correctamente.', 'success');
        } catch(err) {
            showNotification(err.message || `Error guardando la entrada.`, 'error');
        } finally {
            setIsSavingRecord(false);
        }
    };
    
    const handleAttachmentChange = (event) => {
        if (event.target.files && event.target.files[0]) {
            const file = event.target.files[0];
            setCurrentRecordForm(prev => ({ ...prev, attachment: file }));
        }
    };

    const handleViewPatientDetails = (patient) => setSelectedPatient(patient);
    const handleBackToList = () => setSelectedPatient(null);
    const handleOpenRecordFormModal = (recordToEdit = null) => {
        if (recordToEdit) {
            setCurrentRecordForm({ ...initialClinicalRecordState, ...recordToEdit, attachment: null });
            setIsEditingRecordForm(true);
        } else {
            setCurrentRecordForm(initialClinicalRecordState);
            setIsEditingRecordForm(false);
        }
        setOpenRecordFormModal(true);
    };
    const handleCloseRecordFormModal = () => {
        setOpenRecordFormModal(false);
        setCurrentRecordForm(initialClinicalRecordState);
        setIsEditingRecordForm(false);
    };
    const handleRecordInputChange = (event) => {
        const { name, value } = event.target;
        setCurrentRecordForm(prev => ({ ...prev, [name]: value }));
    };
    const handleDeleteRecordRequest = (recordId) => {
        setRecordToDeleteId(recordId);
        setOpenDeleteRecordConfirmModal(true);
    };
    const handleCloseDeleteRecordConfirmModal = () => {
        setOpenDeleteRecordConfirmModal(false);
        setRecordToDeleteId(null);
    };
    const handleConfirmDeleteRecord = async () => {
        if (recordToDeleteId) {
            try {
                await authFetch(`/api/clinical-records/${recordToDeleteId}`, { method: 'DELETE' });
                fetchClinicalRecords(selectedPatient.id);
                showNotification('Registro de historia clínica eliminado correctamente.', 'success');
            } catch (err) {
                showNotification(err.message || `Error eliminando la entrada.`, 'error');
            }
        }
        handleCloseDeleteRecordConfirmModal();
    };
    const handleOpenAddPatientModal = () => setOpenAddPatientModal(true);
    const handleCloseAddPatientModal = () => {
        setOpenAddPatientModal(false);
        setNewPatientData(initialNewPatientState);
        setNewPatientErrors({});
    };
    const handleNewPatientChange = (event) => {
        const { name, value } = event.target;
        setNewPatientData(prev => ({ ...prev, [name]: value }));
        if (newPatientErrors[name]) setNewPatientErrors(prev => ({...prev, [name]: null}));
    };
    const handleNewPatientDateChange = (newDate) => setNewPatientData(prev => ({ ...prev, birthDate: newDate }));
    const validateNewPatientForm = () => {
        const errors = {};
        if (!newPatientData.dni.trim()) errors.dni = 'DNI es requerido.';
        if (patients.some(p => p.dni === newPatientData.dni.trim())) errors.dni = 'Este DNI ya está registrado.';
        if (!newPatientData.lastName.trim()) errors.lastName = 'Apellido es requerido.';
        if (!newPatientData.firstName.trim()) errors.firstName = 'Nombre es requerido.';
        if (!newPatientData.email.trim()) errors.email = 'Email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(newPatientData.email)) errors.email = 'Formato de email inválido.';
        setNewPatientErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveNewPatient = async () => {
        if (!validateNewPatientForm()) return;
        try {
            const newPatientPayload = { ...newPatientData, birthDate: newPatientData.birthDate ? format(newPatientData.birthDate, 'yyyy-MM-dd') : null };
            await authFetch('/api/patients', { method: 'POST', body: JSON.stringify(newPatientPayload) });
            fetchInitialData();
            handleCloseAddPatientModal();
            showNotification('Paciente añadido correctamente.', 'success');
        } catch (err) {
            setNewPatientErrors(prev => ({ ...prev, form: err.message }));
            showNotification(err.message || `Error al añadir el paciente.`, 'error');
        }
    };
    
    // --- ESTA ES LA FUNCIÓN QUE SE USA PERO NO TENÍA SU MODAL ---
    const handleEditPatient = (patient) => {
        setPatientForValidation(patient);
        setEditingPatientData({
            id: patient.id, dni: patient.dni, lastName: patient.lastName || '',
            firstName: patient.firstName || '', email: patient.email,
            phone: patient.phone || '',
            birthDate: patient.birthDate ? parseISO(patient.birthDate) : null,
        });
        setEditingPatientErrors({});
        setOpenEditPatientModal(true);
    };

    const handleCloseEditPatientModal = () => {
        setOpenEditPatientModal(false);
        setEditingPatientData(null);
        setPatientForValidation(null);
        setEditingPatientErrors({});
    };
    const handleEditingPatientChange = (event) => {
        const { name, value } = event.target;
        setEditingPatientData(prev => ({ ...prev, [name]: value }));
        if (editingPatientErrors[name]) setEditingPatientErrors(prev => ({...prev, [name]: null}));
    };
    const handleEditingPatientDateChange = (newDate) => setEditingPatientData(prev => ({ ...prev, birthDate: newDate }));
    const validateEditingPatientForm = () => {
        const errors = {};
        if (!editingPatientData || !patientForValidation) return false;
        if (!editingPatientData.dni?.trim()) errors.dni = 'DNI es requerido.';
        if (editingPatientData.dni?.trim() !== patientForValidation.dni && patients.some(p => p.id !== editingPatientData.id && p.dni === editingPatientData.dni.trim())) {
            errors.dni = 'Este DNI ya está registrado para otro paciente.';
        }
        if (!editingPatientData.lastName?.trim()) errors.lastName = 'Apellido es requerido.';
        if (!editingPatientData.firstName?.trim()) errors.firstName = 'Nombre es requerido.';
        if (!editingPatientData.email?.trim()) errors.email = 'Email es requerido.';
        else if (!/\S+@\S+\.\S+/.test(editingPatientData.email)) errors.email = 'Formato de email inválido.';
        setEditingPatientErrors(errors);
        return Object.keys(errors).length === 0;
    };
    const handleSaveEditedPatient = async () => {
        if (!validateEditingPatientForm()) return;
        try {
            const updatedPatientPayload = { ...editingPatientData, birthDate: editingPatientData.birthDate ? format(editingPatientData.birthDate, 'yyyy-MM-dd') : null };
            const updatedPatient = await authFetch(`/api/patients/${editingPatientData.id}`, { method: 'PUT', body: JSON.stringify(updatedPatientPayload) });
            fetchInitialData();
            if (selectedPatient) {
                const patientWithFullName = { ...updatedPatient, fullName: `${updatedPatient.firstName || ''} ${updatedPatient.lastName || ''}`.trim() };
                setSelectedPatient(patientWithFullName);
            }
            handleCloseEditPatientModal();
            showNotification('Paciente actualizado correctamente.', 'success');
        } catch (err) {
            setEditingPatientErrors(prev => ({ ...prev, form: err.message }));
            showNotification(err.message || `Error al actualizar el paciente.`, 'error');
        }
    };
    const handleOpenViewRecordModal = (record) => {
        setRecordToView(record);
        setOpenViewRecordModal(true);
    };
    const handleCloseViewRecordModal = () => {
        setOpenViewRecordModal(false);
        setRecordToView(null);
    };
    const handleTogglePatientStatusRequest = (patient) => {
        setPatientToToggle(patient);
        setOpenTogglePatientStatusConfirmModal(true);
    };
    const handleConfirmTogglePatientStatus = async () => {
        if (!patientToToggle) return;
        try {
            await authFetch(`/api/patients/${patientToToggle.id}`, { method: 'DELETE' });
            const action = patientToToggle.isActive ? 'archivado' : 'reactivado';
            showNotification(`Paciente ${action} correctamente.`, 'success');
            if (selectedPatient && selectedPatient.id === patientToToggle.id) {
                setSelectedPatient(null);
            }
            fetchInitialData();
        } catch (err) {
            showNotification(err.message || `Error al cambiar el estado del paciente.`, 'error');
        } finally {
            setOpenTogglePatientStatusConfirmModal(false);
            setPatientToToggle(null);
        }
    };
    const handleCloseTogglePatientStatusConfirmModal = () => {
        setOpenTogglePatientStatusConfirmModal(false);
        setPatientToToggle(null);
    };

    if (loading) { return ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box> ); }
    if (error) { return <Alert severity="error" sx={{m: 2}}>{error}</Alert> }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            {!selectedPatient && (
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack direction={{xs: 'column', md: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
                        <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>Mis Pacientes</Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                            <ToggleButtonGroup
                                value={showArchived} exclusive
                                onChange={(e, newValue) => { if(newValue !== null) setShowArchived(newValue); }}
                                size="small"
                            >
                                <ToggleButton value={false}>Activos</ToggleButton>
                                <ToggleButton value={true}>Archivados</ToggleButton>
                            </ToggleButtonGroup>
                            <Button variant="contained" startIcon={<PersonAddIcon />} onClick={handleOpenAddPatientModal}>Añadir Paciente</Button>
                        </Stack>
                    </Stack>
                    <MaterialReactTable
                        columns={patientTableColumns} data={filteredPatientsForTable}
                        localization={MRT_Localization_ES} enableRowActions
                        positionActionsColumn="last" enableColumnResizing layoutMode="grid"
                        muiTablePaperProps={{ elevation: 0 }}
                        renderRowActions={({ row }) => (
                            <Box sx={{ display: 'flex', gap: '0.25rem' }}>
                                <Tooltip title="Ver Detalles"><IconButton size="small" onClick={() => handleViewPatientDetails(row.original)}><VisibilityIcon /></IconButton></Tooltip>
                                <Tooltip title="Editar Paciente"><IconButton size="small" onClick={() => handleEditPatient(row.original)}><EditIcon /></IconButton></Tooltip>
                                {row.original.isActive ? (
                                    <Tooltip title="Archivar Paciente"><IconButton size="small" color="warning" onClick={() => handleTogglePatientStatusRequest(row.original)}><ArchiveIcon /></IconButton></Tooltip>
                                ) : (
                                    <Tooltip title="Reactivar Paciente"><IconButton size="small" color="success" onClick={() => handleTogglePatientStatusRequest(row.original)}><UnarchiveIcon /></IconButton></Tooltip>
                                )}
                            </Box>
                        )}
                        enableGlobalFilter initialState={{ showGlobalFilter: true }}
                        muiSearchTextFieldProps={{
                            placeholder: 'Buscar pacientes...',
                            sx: { m: '0.5rem 0', width: '100%' },
                            variant: 'outlined', size: 'small',
                        }}
                        positionGlobalFilter="left"
                    />
                </Paper>
            )}

            {selectedPatient && (
                <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                        <Button startIcon={<ArrowBackIcon />} onClick={handleBackToList}>Volver a la Lista</Button>
                        <Box>
                            <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={() => handleEditPatient(selectedPatient)} sx={{ mr: 1 }}>Editar Paciente</Button>
                            {selectedPatient.isActive ? (
                                <Button variant="outlined" color="warning" startIcon={<ArchiveIcon />} onClick={() => handleTogglePatientStatusRequest(selectedPatient)}>Archivar Paciente</Button>
                            ) : (
                                <Button variant="outlined" color="success" startIcon={<UnarchiveIcon />} onClick={() => handleTogglePatientStatusRequest(selectedPatient)}>Reactivar Paciente</Button>
                            )}
                        </Box>
                    </Stack>
                    <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems="center" mb={2} sx={{textAlign: {xs: 'center', sm: 'left'}}}>
                        <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem', flexShrink: 0 }}>{getInitials(selectedPatient.fullName)}</Avatar>
                        <Box>
                            <Typography variant="h5">{selectedPatient.fullName}</Typography>
                            <Typography variant="body1" color="text.secondary">DNI: {selectedPatient.dni}</Typography>
                            <Typography variant="caption" color="text.secondary">Email: {selectedPatient.email} | Tel: {selectedPatient.phone || 'N/A'}</Typography>
                            {selectedPatient.birthDate && <Typography variant="caption" display="block" color="text.secondary">Nac.: {format(parseISO(selectedPatient.birthDate), "dd/MM/yyyy", { locale: es })}</Typography>}
                        </Box>
                    </Stack>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">Historia Clínica</Typography>
                        <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpenRecordFormModal()}>Nueva Entrada</Button>
                    </Box>
                    {loadingRecords ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>
                    ) : clinicalRecords.length === 0 ? (
                        <Typography color="text.secondary" sx={{textAlign: 'center', my: 3}}>No hay registros en la historia clínica de este paciente.</Typography>
                    ) : (
                        <TableContainer component={Paper} variant="outlined">
                             <Table size="small">
                                <TableHead><TableRow><TableCell>Asunto</TableCell><TableCell>Fecha</TableCell><TableCell>Patología</TableCell><TableCell>Adjunto</TableCell><TableCell align="center">Acciones</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {clinicalRecords.map(record => (
                                        <TableRow key={record.id}>
                                            <TableCell>{record.title || "Entrada General"}</TableCell>
                                            <TableCell>{record.entryDate && isValid(parseISO(record.entryDate)) ? format(parseISO(record.entryDate), "dd/MM/yyyy") : 'N/A'}</TableCell>
                                            <TableCell><Chip label={record.pathology || 'N/A'} size="small" color={record.pathology ? 'info' : 'default'} /></TableCell>
                                            <TableCell>
                                                {record.attachmentPath && (
                                                     <IconButton size="small" href={`${API_BASE_URL}/storage/${record.attachmentPath.split(/[\\/]/).pop()}`} target="_blank" rel="noopener noreferrer"><DownloadIcon fontSize="inherit" /></IconButton>
                                                )}
                                            </TableCell>
                                            <TableCell align="center">
                                                <Tooltip title="Ver Detalles"><IconButton onClick={() => handleOpenViewRecordModal(record)} size="small"><VisibilityIcon fontSize="inherit"/></IconButton></Tooltip>
                                                <Tooltip title="Editar"><IconButton onClick={() => handleOpenRecordFormModal(record)} size="small"><EditIcon fontSize="inherit"/></IconButton></Tooltip>
                                                <Tooltip title="Eliminar"><IconButton onClick={() => handleDeleteRecordRequest(record.id)} size="small"><DeleteIcon fontSize="inherit"/></IconButton></Tooltip>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    )}
                </Paper>
            )}
            
            <Dialog open={openAddPatientModal} onClose={handleCloseAddPatientModal} maxWidth="xs" fullWidth>
                <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Añadir Nuevo Paciente</DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}><Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>{getInitials(`${newPatientData.firstName} ${newPatientData.lastName}`)}</Avatar></Box>
                    <Grid container spacing={2} direction="column">
                        <Grid item xs={12}><TextField autoFocus name="dni" label="DNI *" value={newPatientData.dni} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.dni} helperText={newPatientErrors.dni} /></Grid>
                        <Grid item xs={12}><TextField name="lastName" label="Apellido *" value={newPatientData.lastName} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.lastName} helperText={newPatientErrors.lastName} /></Grid>
                        <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={newPatientData.firstName} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.firstName} helperText={newPatientErrors.firstName} /></Grid>
                        <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={newPatientData.email} onChange={handleNewPatientChange} fullWidth error={!!newPatientErrors.email} helperText={newPatientErrors.email} /></Grid>
                        <Grid item xs={12}><TextField name="phone" label="Teléfono" value={newPatientData.phone} onChange={handleNewPatientChange} fullWidth /></Grid>
                        <Grid item xs={12}><DatePicker label="Fecha de Nacimiento" value={newPatientData.birthDate} onChange={handleNewPatientDateChange} renderInput={(params) => <TextField {...params} fullWidth />} maxDate={new Date()} format="dd/MM/yyyy"/></Grid>
                    </Grid>
                     {newPatientErrors.form && <Alert severity="error" sx={{mt:2}}>{newPatientErrors.form}</Alert>}
                </DialogContent>
                <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}><Button onClick={handleCloseAddPatientModal} color="inherit">Cancelar</Button><Button onClick={handleSaveNewPatient} variant="contained">Guardar Paciente</Button></DialogActions>
            </Dialog>

            {/* --- INICIO DEL MODAL CORREGIDO Y REINSERTADO --- */}
            {editingPatientData && (
                <Dialog open={openEditPatientModal} onClose={handleCloseEditPatientModal} maxWidth="xs" fullWidth>
                    <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>Editar Datos del Paciente</DialogTitle>
                    <DialogContent sx={{ pt: 1 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 2 }}>
                            <Avatar sx={{ width: 80, height: 80, mb: 1, fontSize: '2rem', bgcolor: 'primary.light' }}>
                                {getInitials(`${editingPatientData.firstName} ${editingPatientData.lastName}`)}
                            </Avatar>
                        </Box>
                        <Grid container spacing={2} direction="column">
                            <Grid item xs={12}><TextField name="dni" label="DNI *" value={editingPatientData.dni} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.dni} helperText={editingPatientErrors.dni}/></Grid>
                            <Grid item xs={12}><TextField autoFocus name="lastName" label="Apellido *" value={editingPatientData.lastName} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.lastName} helperText={editingPatientErrors.lastName}/></Grid>
                            <Grid item xs={12}><TextField name="firstName" label="Nombre *" value={editingPatientData.firstName} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.firstName} helperText={editingPatientErrors.firstName}/></Grid>
                            <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={editingPatientData.email} onChange={handleEditingPatientChange} fullWidth error={!!editingPatientErrors.email} helperText={editingPatientErrors.email}/></Grid>
                            <Grid item xs={12}><TextField name="phone" label="Teléfono" value={editingPatientData.phone} onChange={handleEditingPatientChange} fullWidth/></Grid>
                            <Grid item xs={12}>
                                <DatePicker label="Fecha de Nacimiento" value={editingPatientData.birthDate} onChange={handleEditingPatientDateChange} renderInput={(params) => <TextField {...params} fullWidth />} maxDate={new Date()} format="dd/MM/yyyy"/>
                            </Grid>
                        </Grid>
                        {editingPatientErrors.form && <Alert severity="error" sx={{mt:2}}>{editingPatientErrors.form}</Alert>}
                    </DialogContent>
                    <DialogActions sx={{p: '16px 24px', justifyContent: 'space-between'}}>
                        <Button onClick={handleCloseEditPatientModal} color="inherit">Cancelar</Button>
                        <Button onClick={handleSaveEditedPatient} variant="contained">Guardar Cambios</Button>
                    </DialogActions>
                </Dialog>
            )}
            {/* --- FIN DEL MODAL CORREGIDO --- */}

            <Dialog open={openTogglePatientStatusConfirmModal} onClose={handleCloseTogglePatientStatusConfirmModal}>
                <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
                <DialogContent><DialogContentText>¿Está seguro de que desea **{patientToToggle?.isActive ? 'archivado' : 'reactivar'}** al paciente **{patientToToggle?.fullName}**?{patientToToggle?.isActive && " Un paciente archivado no aparecerá en las búsquedas para nuevos turnos."}</DialogContentText></DialogContent>
                <DialogActions><Button onClick={handleCloseTogglePatientStatusConfirmModal}>Cancelar</Button><Button onClick={handleConfirmTogglePatientStatus} color={patientToToggle?.isActive ? "warning" : "success"}>{patientToToggle?.isActive ? 'Archivar' : 'Reactivar'}</Button></DialogActions>
            </Dialog>

             <Dialog open={openViewRecordModal} onClose={handleCloseViewRecordModal} maxWidth="md" fullWidth>
                <DialogTitle>Detalle de Entrada de Historia Clínica</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="h6" gutterBottom>{recordToView?.title || "Entrada sin título"}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">Creado: {recordToView?.entryDate && isValid(parseISO(recordToView.entryDate)) ? format(parseISO(recordToView.entryDate), "PPPPp", { locale: es }) : 'N/A'}</Typography>
                    {recordToView?.updatedAt && recordToView?.entryDate !== recordToView?.updatedAt && isValid(parseISO(recordToView.updatedAt)) && (<Typography variant="caption" display="block" color="text.secondary">Última Modificación: {format(parseISO(recordToView.updatedAt), "PPPPp", { locale: es })}</Typography>)}
                    {recordToView?.pathology && (<Typography variant="subtitle1" sx={{mt:2, mb:1, color: 'info.main'}}>Patología Asociada: {recordToView.pathology}</Typography>)}
                    <Typography variant="body1" sx={{mt:2, whiteSpace: 'pre-wrap'}}>{recordToView?.content}</Typography>
                    {recordToView?.attachmentPath && (
                        <Box mt={2}>
                            <Typography variant="subtitle2" gutterBottom>Archivo Adjunto:</Typography>
                            <Chip 
                                icon={<AttachFileIcon />} 
                                label={recordToView.attachmentName} 
                                component="a" 
                                href={`${API_BASE_URL}/storage/${recordToView.attachmentPath.split(/[\\/]/).pop()}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                clickable 
                                variant="outlined"
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions sx={{p: '16px 24px'}}><Button onClick={handleCloseViewRecordModal}>Cerrar</Button></DialogActions>
            </Dialog>

            <Dialog open={openDeleteRecordConfirmModal} onClose={handleCloseDeleteRecordConfirmModal}>
                <DialogTitle>Confirmar Eliminación de Registro de HC</DialogTitle>
                <DialogContent><DialogContentText>¿Está seguro de que desea eliminar esta entrada de la historia clínica? Esta acción no se puede deshacer.</DialogContentText></DialogContent>
                <DialogActions><Button onClick={handleCloseDeleteRecordConfirmModal}>Cancelar</Button><Button onClick={handleConfirmDeleteRecord} color="error">Eliminar</Button></DialogActions>
            </Dialog>
            
            <Dialog open={openRecordFormModal} onClose={handleCloseRecordFormModal} maxWidth="md" fullWidth>
                <DialogTitle>{isEditingRecordForm ? 'Editar Entrada de HC' : 'Nueva Entrada en Historia Clínica'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} direction="column" sx={{pt:1}}>
                        <Grid item xs={12}><TextField autoFocus margin="dense" name="title" label="Motivo de la consulta/Asunto" type="text" fullWidth value={currentRecordForm.title} onChange={handleRecordInputChange}/></Grid>
                        <Grid item xs={12}>
                            <FormControl fullWidth margin="dense">
                                <InputLabel>Patología Asociada (Opcional)</InputLabel>
                                <Select name="pathology" value={currentRecordForm.pathology} label="Patología Asociada (Opcional)" onChange={handleRecordInputChange}>
                                    <MenuItem value=""><em>Ninguna</em></MenuItem>
                                    {pathologies.map((pathology) => (
                                        <MenuItem key={pathology.id} value={pathology.name}>{pathology.name}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={12}><TextField margin="dense" name="content" label="Detalles *" type="text" fullWidth multiline rows={8} value={currentRecordForm.content} onChange={handleRecordInputChange} required /></Grid>
                        <Grid item xs={12}>
                            <Button variant="outlined" component="label" startIcon={<AttachFileIcon />} fullWidth sx={{textTransform: 'none', mt:1}}>
                                {currentRecordForm.attachment ? 'Cambiar Archivo' : 'Adjuntar Archivo'}
                                <input type="file" hidden onChange={handleAttachmentChange} accept=".pdf,.jpg,.jpeg,.png,.gif"/>
                            </Button>
                            <Typography variant="caption" display="block" sx={{mt:1, textAlign: 'center', color: 'text.secondary'}}>
                                {currentRecordForm.attachment ? `Nuevo: ${currentRecordForm.attachment.name}` : (currentRecordForm.attachmentName || 'Ningún archivo seleccionado.')}
                            </Typography>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions sx={{p: '16px 24px'}}>
                    <Button onClick={handleCloseRecordFormModal} disabled={isSavingRecord}>Cancelar</Button>
                    <Button onClick={handleSaveRecord} variant="contained" disabled={!currentRecordForm.content?.trim() || isSavingRecord}>
                        {isSavingRecord ? <CircularProgress size={24} color="inherit" /> : (isEditingRecordForm ? 'Actualizar' : 'Guardar')}
                    </Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    );
};

export default PatientsView;