import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Button, Tooltip, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, FormControl, InputLabel,
    Select, MenuItem, Grid, Chip, Switch, FormControlLabel, InputAdornment, DialogContentText
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ArchiveIcon from '@mui/icons-material/Archive';
import UnarchiveIcon from '@mui/icons-material/Unarchive';
import authFetch from '../../../utils/authFetch';
import { useNotification } from '../../../context/NotificationContext';
import { useAuth } from '../../../context/AuthContext';

const initialUserState = {
    dni: '', fullName: '', email: '', password: '',
    confirmPassword: '', role: 'PROFESSIONAL', specialty: '', isActive: true
};

const UserManagementView = () => {
    const { showNotification } = useNotification();
    const { authUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentUser, setCurrentUser] = useState(initialUserState);
    const [validationErrors, setValidationErrors] = useState({});
    const [openResetPasswordModal, setOpenResetPasswordModal] = useState(false);
    const [userToResetPassword, setUserToResetPassword] = useState(null);
    const [resetPasswordData, setResetPasswordData] = useState({ newPassword: '', confirmNewPassword: '' });
    const [resetPasswordErrors, setResetPasswordErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [openToggleStatusConfirmModal, setOpenToggleStatusConfirmModal] = useState(false);
    const [userToToggle, setUserToToggle] = useState(null);
    const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const usersData = await authFetch('/api/admin/users');
            setUsers(usersData || []);
        } catch (err) {
            showNotification(err.message || 'Error al cargar usuarios.', 'error');
            setError(err.message || 'Error al cargar usuarios.');
        } finally {
            setLoading(false);
        }
    }, [showNotification]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setCurrentUser(initialUserState);
        setValidationErrors({});
        setIsModalOpen(true);
    };

    const handleOpenEditModal = async (user) => {
        setIsEditing(true);
        try {
            setCurrentUser({ ...user, password: '', confirmPassword: '' });
        } catch (err) {
            showNotification(err.message, 'error');
            setCurrentUser({ ...user, password: '', confirmPassword: '' });
        }
        setValidationErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleUserChange = (event) => {
        const { name, value, type, checked } = event.target;
        const val = type === 'checkbox' ? checked : value;
        setCurrentUser(prev => ({ ...prev, [name]: val }));
        if (validationErrors[name]) setValidationErrors(prev => ({...prev, [name]: null}));
    };

    const validateForm = () => {
        const errors = {};
        if (!currentUser.dni?.trim()) errors.dni = 'DNI es requerido.';
        if (!currentUser.fullName?.trim()) errors.fullName = 'Nombre completo es requerido.';
        if (!currentUser.email?.trim()) {
            errors.email = 'Email es requerido.';
        } else if (!/\S+@\S+\.\S+/.test(currentUser.email)) {
            errors.email = 'Formato de email inválido.';
        }
        if (!isEditing) {
            if (!currentUser.password) errors.password = 'Contraseña es requerida.';
            if (currentUser.password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';
            if (currentUser.password !== currentUser.confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
        }
        if (!currentUser.role) errors.role = 'Rol es requerido.';
        if (currentUser.role === 'PROFESSIONAL' && !currentUser.specialty?.trim()) {
            errors.specialty = 'Especialidad es requerida para un profesional.';
        }
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSaveUser = async () => {
        if (!validateForm()) return;
        const url = isEditing ? `/api/admin/users/${currentUser.id}` : '/api/admin/users';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            await authFetch(url, {
                method: method,
                body: JSON.stringify(currentUser),
            });
            showNotification(`Usuario ${isEditing ? 'actualizado' : 'creado'} exitosamente.`, 'success');
            handleCloseModal();
            fetchUsers();
        } catch (err) {
            showNotification(err.message || `Error al ${isEditing ? 'actualizar' : 'crear'} el usuario.`, 'error');
        }
    };

    const handleToggleUserStatusRequest = (user) => {
        setUserToToggle(user);
        setOpenToggleStatusConfirmModal(true);
    };

    const handleConfirmToggleUserStatus = async () => {
        if (!userToToggle) return;
        try {
            await authFetch(`/api/admin/users/${userToToggle.id}`, { method: 'PATCH' });
            const action = userToToggle.isActive ? 'desactivado' : 'reactivado';
            showNotification(`Usuario ${action} exitosamente.`, 'success');
            fetchUsers();
        } catch (err) {
            showNotification(err.message || 'Error al cambiar el estado del usuario.', 'error');
        } finally {
            setOpenToggleStatusConfirmModal(false);
            setUserToToggle(null);
        }
    };

    const handleOpenResetPasswordModal = (user) => {
        setUserToResetPassword(user);
        setResetPasswordData({ newPassword: '', confirmNewPassword: '' });
        setResetPasswordErrors({});
        setOpenResetPasswordModal(true);
    };

    const handleCloseResetPasswordModal = () => {
        setOpenResetPasswordModal(false);
        setUserToResetPassword(null);
    };

    const handleResetPasswordChange = (event) => {
        const { name, value } = event.target;
        setResetPasswordData(prev => ({ ...prev, [name]: value }));
        if (resetPasswordErrors[name]) setResetPasswordErrors(prev => ({...prev, [name]: null}));
    };

    const validateResetPasswordForm = () => {
        const errors = {};
        if (!resetPasswordData.newPassword) errors.newPassword = 'Contraseña es requerida.';
        if (resetPasswordData.newPassword.length < 6) errors.newPassword = 'La contraseña debe tener al menos 6 caracteres.';
        if (resetPasswordData.newPassword !== resetPasswordData.confirmNewPassword) {
            errors.confirmNewPassword = 'Las contraseñas no coinciden.';
        }
        setResetPasswordErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleResetPasswordSubmit = async () => {
        if (!validateResetPasswordForm()) return;
        try {
            await authFetch(`/api/admin/users/${userToResetPassword.id}/reset-password`, {
                method: 'PUT',
                body: JSON.stringify({ newPassword: resetPasswordData.newPassword }),
            });
            showNotification(`Contraseña de ${userToResetPassword.fullName} restablecida exitosamente.`, 'success');
            handleCloseResetPasswordModal();
        } catch (err) {
            showNotification(err.message || 'Error al restablecer la contraseña.', 'error');
        }
    };
    
    const handleDeleteUserRequest = (user) => {
        setUserToDelete(user);
        setOpenDeleteConfirmModal(true);
    };
    const handleConfirmDeleteUser = async () => {
        if (!userToDelete) return;
        try {
            await authFetch(`/api/admin/users/${userToDelete.id}`, { method: 'DELETE' });
            showNotification(`Usuario ${userToDelete.fullName} eliminado permanentemente.`, 'success');
            fetchUsers();
        } catch (err) {
            showNotification(err.message || 'Error al eliminar el usuario.', 'error');
        } finally {
            setOpenDeleteConfirmModal(false);
            setUserToDelete(null);
        }
    };

    const handleClickShowPassword = () => setShowPassword((show) => !show);
    const handleMouseDownPassword = (event) => event.preventDefault();

    const columns = useMemo(() => [
        { accessorKey: 'fullName', header: 'Nombre Completo' },
        { accessorKey: 'dni', header: 'DNI' },
        { accessorKey: 'email', header: 'Correo Electrónico' },
        { accessorKey: 'role', header: 'Rol' },
        { accessorKey: 'isActive', header: 'Estado', Cell: ({ cell }) => (
            <Chip label={cell.getValue() ? 'Activo' : 'Inactivo'} color={cell.getValue() ? 'success' : 'error'} size="small" />
        )},
    ], []);

    return (
        <Box>
            <Typography variant="h4" gutterBottom>Gestión de Usuarios</Typography>
            <MaterialReactTable
                columns={columns}
                data={users}
                localization={MRT_Localization_ES}
                state={{ isLoading: loading, showAlertBanner: !!error, showProgressBars: loading }}
                muiToolbarAlertBannerProps={error ? { color: 'error', children: error } : undefined}
                enableRowActions
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '0.5rem' }}>
                        <Tooltip title="Editar"><IconButton onClick={() => handleOpenEditModal(row.original)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="Restablecer Contraseña"><IconButton onClick={() => handleOpenResetPasswordModal(row.original)}><VpnKeyIcon /></IconButton></Tooltip>
                        {row.original.isActive ? (
                            <Tooltip title="Desactivar Usuario">
                                <IconButton color="error" onClick={() => handleToggleUserStatusRequest(row.original)}>
                                    <ArchiveIcon />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title="Reactivar Usuario">
                                <IconButton color="success" onClick={() => handleToggleUserStatusRequest(row.original)}>
                                    <UnarchiveIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                        {authUser.user.id !== row.original.id && (
                             <Tooltip title="Eliminar Permanentemente">
                                <IconButton color="error" onClick={() => handleDeleteUserRequest(row.original)}>
                                    <DeleteForeverIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Box>
                )}
                renderTopToolbarCustomActions={() => (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateModal}>
                        Crear Nuevo Usuario
                    </Button>
                )}
            />
            <Dialog open={openDeleteConfirmModal} onClose={() => setOpenDeleteConfirmModal(false)}>
                <DialogTitle sx={{color: 'error.main'}}>Confirmar Eliminación Permanente</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Está absolutamente seguro de que desea eliminar al usuario <strong>{userToDelete?.fullName}</strong>?
                    </DialogContentText>
                    <DialogContentText sx={{mt: 1, fontWeight: 'bold'}}>
                        Esta acción no se puede deshacer y borrará todos sus datos asociados.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteConfirmModal(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmDeleteUser} color="error" variant="contained">
                        Sí, Eliminar
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={isModalOpen} onClose={handleCloseModal} maxWidth="xs" fullWidth>
                <DialogTitle>{isEditing ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} direction="column" sx={{ pt: 1 }}>
                        <Grid item xs={12}><TextField name="dni" label="DNI *" value={currentUser.dni || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.dni} helperText={validationErrors.dni} disabled={isEditing} /></Grid>
                        <Grid item xs={12}><TextField name="fullName" label="Nombre Completo *" value={currentUser.fullName || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.fullName} helperText={validationErrors.fullName} /></Grid>
                        <Grid item xs={12}><TextField name="email" label="Correo Electrónico *" type="email" value={currentUser.email || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.email} helperText={validationErrors.email} /></Grid>
                        {!isEditing && (
                            <>
                                <Grid item xs={12}><TextField name="password" label="Contraseña *" type={showPassword ? 'text' : 'password'} value={currentUser.password || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.password} helperText={validationErrors.password} /></Grid>
                                <Grid item xs={12}><TextField name="confirmPassword" label="Confirmar Contraseña *" type={showPassword ? 'text' : 'password'} value={currentUser.confirmPassword || ''} onChange={handleUserChange} fullWidth error={!!validationErrors.confirmPassword} helperText={validationErrors.confirmPassword} /></Grid>
                            </>
                        )}
                        <Grid item xs={12}>
                            <FormControl fullWidth error={!!validationErrors.role}>
                                <InputLabel>Rol *</InputLabel>
                                <Select name="role" value={currentUser.role || ''} label="Rol *" onChange={handleUserChange}>
                                    <MenuItem value="PROFESSIONAL">Profesional</MenuItem>
                                    <MenuItem value="ADMIN">Administrador</MenuItem>
                                </Select>
                            </FormControl>
                        </Grid>
                        {isEditing && (
                            <Grid item xs={12}>
                                <FormControlLabel control={<Switch name="isActive" checked={!!currentUser.isActive} onChange={handleUserChange} />} label="Usuario Activo" />
                            </Grid>
                        )}
                        {currentUser.role === 'PROFESSIONAL' && (
                            <Grid item xs={12}>
                                <TextField 
                                    name="specialty" 
                                    label="Especialidad (para Profesional)" 
                                    value={currentUser.specialty || ''} 
                                    onChange={handleUserChange} 
                                    fullWidth 
                                    error={!!validationErrors.specialty} 
                                    helperText={validationErrors.specialty} 
                                />
                            </Grid>
                        )}
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSaveUser} variant="contained">{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openResetPasswordModal} onClose={handleCloseResetPasswordModal} maxWidth="xs" fullWidth>
                <DialogTitle>Restablecer Contraseña para {userToResetPassword?.fullName}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} direction="column" sx={{ pt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                name="newPassword" label="Nueva Contraseña *" type={showPassword ? 'text' : 'password'}
                                value={resetPasswordData.newPassword} onChange={handleResetPasswordChange}
                                fullWidth error={!!resetPasswordErrors.newPassword} helperText={resetPasswordErrors.newPassword}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                name="confirmNewPassword" label="Confirmar Nueva Contraseña *" type={showPassword ? 'text' : 'password'}
                                value={resetPasswordData.confirmNewPassword} onChange={handleResetPasswordChange}
                                fullWidth error={!!resetPasswordErrors.confirmNewPassword} helperText={resetPasswordErrors.confirmNewPassword}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseResetPasswordModal}>Cancelar</Button>
                    <Button onClick={handleResetPasswordSubmit} variant="contained">Restablecer</Button>
                </DialogActions>
            </Dialog>

            <Dialog open={openToggleStatusConfirmModal} onClose={() => setOpenToggleStatusConfirmModal(false)}>
                <DialogTitle>Confirmar Cambio de Estado</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Está seguro de que desea **{userToToggle?.isActive ? 'desactivar' : 'reactivar'}** al usuario **{userToToggle?.fullName}**?
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenToggleStatusConfirmModal(false)}>Cancelar</Button>
                    <Button onClick={handleConfirmToggleUserStatus} color={userToToggle?.isActive ? "error" : "success"}>
                        {userToToggle?.isActive ? 'Desactivar' : 'Reactivar'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagementView;