import React, { useState, useEffect, useMemo, useCallback } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Box, Typography, Paper, IconButton, Avatar, Tooltip,
    Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField,
    Button, Alert, DialogContentText, Chip, Divider, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import { format, parseISO, isValid } from 'date-fns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { useNotification } from '../../../context/NotificationContext';

const AdminPatientsView = () => {
    const { showNotification } = useNotification();
    const [patients, setPatients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [loadingRecords, setLoadingRecords] = useState(false);
    const [clinicalRecords, setClinicalRecords] = useState([]);
    
    const [openEditPatientModal, setOpenEditPatientModal] = useState(false);
    const [editingPatientData, setEditingPatientData] = useState(null);
    const [patientForValidation, setPatientForValidation] = useState(null);
    const [editingPatientErrors, setEditingPatientErrors] = useState({});
    
    const [openToggleStatusConfirmModal, setOpenToggleStatusConfirmModal] = useState(false);
    const [patientToToggle, setPatientToToggle] = useState(null);

    const [openDeletePatientConfirmModal, setOpenDeletePatientConfirmModal] = useState(false);
    const [patientToDelete, setPatientToDelete] = useState(null);

    const getInitials = (name) => {
        if (!name || typeof name !== 'string') return '';
        const nameParts = name.trim().split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const fetchPatients = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await authFetch('/api/patients');
            setPatients(data || []);
        } catch (err) {
            setError(err.message || "Error al cargar los pacientes.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPatients();
    }, [fetchPatients]);

    const fetchClinicalRecords = useCallback(async (patientId) => {
        setLoadingRecords(true);
        try {
            const records = await authFetch(`/api/patients/${patientId}/clinical-records`);
            setClinicalRecords(records || []);
        } catch (err) {
            showNotification(err.message || "Error al cargar historia clínica.", 'error');
        } finally {
            setLoadingRecords(false);
        }
    }, [showNotification]);

    useEffect(() => {
        if (selectedPatient) {
            fetchClinicalRecords(selectedPatient.id);
        }
    }, [selectedPatient, fetchClinicalRecords]);

    const handleViewPatientDetails = (patient) => setSelectedPatient(patient);
    const handleBackToList = () => setSelectedPatient(null);

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
    
    const handleTogglePatientStatusRequest = (patient) => {
        setPatientToToggle(patient);
        setOpenToggleStatusConfirmModal(true);
    };

    const handleConfirmTogglePatientStatus = async () => {
        if (!patientToToggle) return;
        try {
            await authFetch(`/api/patients/${patientToToggle.id}`, { method: 'DELETE' });
            const action = patientToToggle.isActive ? 'archivado' : 'reactivado';
            showNotification(`Paciente ${action} correctamente.`, 'success');
            if (selectedPatient && selectedPatient.id === patientToToggle.id) {
                const updatedSelected = { ...selectedPatient, isActive: !selectedPatient.isActive };
                setSelectedPatient(updatedSelected);
            }
            fetchPatients();
        } catch (err) {
            showNotification(err.message || `Error al cambiar estado.`, 'error');
        } finally {
            setOpenToggleStatusConfirmModal(false);
            setPatientToToggle(null);
        }
    };
    
    const handleDeletePatientRequest = (patient) => {
        setPatientToDelete(patient);
        setOpenDeletePatientConfirmModal(true);
    };

    const handleConfirmDeletePatient = async () => {
        if (!patientToDelete) return;
        try {
            await authFetch(`/api/admin/patients/${patientToDelete.id}`, { method: 'DELETE' });
            showNotification('Paciente eliminado permanentemente.', 'success');
            if (selectedPatient && selectedPatient.id === patientToDelete.id) {
                setSelectedPatient(null);
            }
            fetchPatients();
        } catch (err) {
            showNotification(err.message || `Error al eliminar el paciente.`, 'error');
        } finally {
            setOpenDeletePatientConfirmModal(false);
            setPatientToDelete(null);
        }
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
    };

    const handleEditingPatientDateChange = (newDate) => {
        setEditingPatientData(prev => ({ ...prev, birthDate: newDate }));
    };

    const validateEditingPatientForm = () => {
        const errors = {};
        if (!editingPatientData || !patientForValidation) return false;
        if (!editingPatientData.dni?.trim()) errors.dni = 'DNI es requerido.';
        if (editingPatientData.dni?.trim() !== patientForValidation.dni && patients.some(p => p.id !== editingPatientData.id && p.dni === editingPatientData.dni.trim())) {
            errors.dni = 'Este DNI ya está registrado.';
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
            const payload = { ...editingPatientData, birthDate: editingPatientData.birthDate ? format(editingPatientData.birthDate, 'yyyy-MM-dd') : null };
            await authFetch(`/api/patients/${editingPatientData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            await fetchPatients();
            handleCloseEditPatientModal();
            showNotification('Paciente actualizado correctamente.', 'success');
        } catch (err) {
            setEditingPatientErrors(prev => ({ ...prev, form: err.message }));
            showNotification(err.message || `Error al actualizar el paciente.`, 'error');
        }
    };

    const patientTableColumns = useMemo(() => [
        { accessorKey: 'dni', header: 'DNI', size: 100 },
        { accessorKey: 'lastName', header: 'Apellido', size: 150 },
        { accessorKey: 'firstName', header: 'Nombre', size: 150 },
        { accessorKey: 'createdByProfessionalName', header: 'Profesional Asignado', size: 200, Cell: ({ cell }) => cell.getValue() || 'Sistema/Público' },
        {
            accessorKey: 'isActive', header: 'Estado', size: 100,
            Cell: ({ cell }) => (
                <Chip label={cell.getValue() ? 'Activo' : 'Archivado'} color={cell.getValue() ? 'success' : 'default'} size="small" />
            )
        }
    ], []);

    if (loading) { return ( <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box> ); }
    if (error) { return <Alert severity="error" sx={{m: 2}}>{error}</Alert> }
    
    if (selectedPatient) {
        return (
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Button startIcon={<ArrowBackIcon />} onClick={handleBackToList}>Volver a la Lista</Button>
                <Stack direction={{xs: 'column', sm: 'row'}} spacing={2} alignItems="center" my={2} sx={{textAlign: {xs: 'center', sm: 'left'}}}>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56, fontSize: '1.5rem', flexShrink: 0 }}>{getInitials(selectedPatient.fullName)}</Avatar>
                    <Box>
                        <Typography variant="h5">{selectedPatient.fullName}</Typography>
                        <Typography variant="body1" color="text.secondary">DNI: {selectedPatient.dni}</Typography>
                        <Typography variant="caption" color="text.secondary">Email: {selectedPatient.email} | Tel: {selectedPatient.phone || 'N/A'}</Typography>
                        {selectedPatient.birthDate && <Typography variant="caption" display="block" color="text.secondary">Nac.: {format(parseISO(selectedPatient.birthDate), "dd/MM/yyyy")}</Typography>}
                    </Box>
                </Stack>
                <Divider sx={{ my: 2 }} />
                <Typography variant="h6">Historia Clínica</Typography>
                {loadingRecords ? <CircularProgress /> : clinicalRecords.length === 0 ? (
                    <Typography color="text.secondary" sx={{textAlign: 'center', my: 3}}>No hay registros clínicos.</Typography>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{mt: 2}}>
                        <Table size="small">
                            <TableHead><TableRow><TableCell>Asunto</TableCell><TableCell>Fecha</TableCell><TableCell>Patología</TableCell><TableCell>Detalles</TableCell></TableRow></TableHead>
                            <TableBody>
                                {clinicalRecords.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>{record.title || "Entrada General"}</TableCell>
                                        <TableCell>{format(parseISO(record.entryDate), "dd/MM/yyyy")}</TableCell>
                                        <TableCell>{record.pathology || 'N/A'}</TableCell>
                                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{record.content}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        )
    }

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Typography variant="h5" gutterBottom component="div" sx={{m:0, mb: 2}}>
                    Gestión de Pacientes (Global)
                </Typography>
                <MaterialReactTable
                    columns={patientTableColumns}
                    data={patients}
                    localization={MRT_Localization_ES}
                    state={{ isLoading: loading, showAlertBanner: !!error }}
                    muiToolbarAlertBannerProps={error ? { color: 'error', children: error } : undefined}
                    enableRowActions
                    positionActionsColumn="last"
                    enableColumnResizing
                    layoutMode="grid"
                    muiTablePaperProps={{ elevation: 0 }}
                    muiTableHeadCellProps={{ sx: { fontWeight: 'normal', color: 'text.secondary', borderBottom: '1px solid rgba(224, 224, 224, 1)' } }}
                    muiTableBodyCellProps={{ sx: { padding: '12px 16px', border: 'none' } }}
                    muiTableBodyRowProps={{ sx: { borderBottom: '1px solid rgba(224, 224, 224, 1)', '&:last-child td, &:last-child th': { border: 0 } } }}
                    displayColumnDefOptions={{
                        'mrt-row-actions': {
                            header: 'Acciones',
                            size: 160, 
                            minSize: 160, 
                        },
                    }}
                    renderRowActions={({ row }) => (
                        <Box sx={{ display: 'flex', gap: '0.25rem' }}>
                            <Tooltip title="Ver Detalles"><IconButton size="small" onClick={() => handleViewPatientDetails(row.original)}><VisibilityIcon /></IconButton></Tooltip>
                            <Tooltip title="Editar Paciente"><IconButton size="small" onClick={() => handleEditPatient(row.original)}><EditIcon /></IconButton></Tooltip>
                            {row.original.isActive ? (
                                <Tooltip title="Archivar Paciente"><IconButton size="small" color="warning" onClick={() => handleTogglePatientStatusRequest(row.original)}><ArchiveIcon /></IconButton></Tooltip>
                            ) : (
                                <Tooltip title="Reactivar Paciente"><IconButton size="small" color="success" onClick={() => handleTogglePatientStatusRequest(row.original)}><UnarchiveIcon /></IconButton></Tooltip>
                            )}
                            <Tooltip title="Eliminar Permanente"><IconButton size="small" color="error" onClick={() => handleDeletePatientRequest(row.original)}><DeleteIcon /></IconButton></Tooltip>
                        </Box>
                    )}
                    enableColumnFilters={false}
                    enableGlobalFilter
                    initialState={{ showGlobalFilter: true }}
                    muiSearchTextFieldProps={{
                        placeholder: 'Buscar pacientes...', sx: { m: '0.5rem 0', width: '100%' }, variant: 'outlined', size: 'small',
                    }}
                    positionGlobalFilter="left"
                />
            </Paper>

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
                                 <DatePicker
                                    label="Fecha de Nacimiento"
                                    value={editingPatientData.birthDate}
                                    onChange={handleEditingPatientDateChange}
                                    renderInput={(params) => <TextField {...params} fullWidth error={!!editingPatientErrors.birthDate} helperText={editingPatientErrors.birthDate}/>}
                                    maxDate={new Date()}
                                    format="dd/MM/yyyy"
                                />
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

            <Dialog open={openToggleStatusConfirmModal} onClose={() => setOpenToggleStatusConfirmModal(false)}>
                <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Está seguro de que desea **{patientToToggle?.isActive ? 'archivar' : 'reactivar'}** al paciente **{patientToToggle?.fullName}**?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenToggleStatusConfirmModal(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmTogglePatientStatus} color={patientToToggle?.isActive ? "warning" : "success"}>
                        {patientToToggle?.isActive ? 'Archivar' : 'Reactivar'}
                    </Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openDeletePatientConfirmModal} onClose={() => setOpenDeletePatientConfirmModal(false)}>
                <DialogTitle>Confirmar Eliminación Permanente</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Está seguro de que desea **eliminar permanentemente** al paciente **{patientToDelete?.fullName}**? Esta acción es irreversible y borrará todos sus datos.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeletePatientConfirmModal(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDeletePatient} color="error">Eliminar</Button>
                </DialogActions>
            </Dialog>
        </LocalizationProvider>
    )
}

export default AdminPatientsView;