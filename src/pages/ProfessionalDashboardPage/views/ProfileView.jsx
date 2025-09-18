import React, { useState, useEffect, useCallback, useRef } from 'react';
import authFetch from '../../../utils/authFetch';
import { useAuth } from '../../../context/AuthContext';
import {
    Box, Typography, Paper, Grid, TextField, Button, CircularProgress,
    Alert, Avatar, Stack, Dialog, DialogTitle, DialogContent,
    DialogActions, InputAdornment, IconButton, Badge
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { useNotification } from '../../../context/NotificationContext';
import { API_BASE_URL } from '../../../config';

const ProfileView = () => {
    const { showNotification } = useNotification();
    const { authUser, login: updateAuthContextUser, loadingAuth } = useAuth();
    const [profileData, setProfileData] = useState({
        dni: '', fullName: '', email: '', phone: '', specialty: '',
        description: '', profileImageUrl: '',
    });
    const [initialProfileData, setInitialProfileData] = useState({});
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [error, setError] = useState('');
    const [openPasswordModal, setOpenPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const [selectedImageFile, setSelectedImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState('');
    const fileInputRef = useRef(null);

    const handleClickShowPassword = () => setShowPassword((show) => !show);
    const handleMouseDownPassword = (event) => event.preventDefault();

    const fetchProfile = useCallback(async () => {
        if (loadingAuth || !authUser?.user?.id) {
            if (!loadingAuth) setLoading(false);
            return;
        }
        setLoading(true);
        setError('');
        try {
            const userDataPromise = authFetch(`/api/users/me`);
            let professionalDataPromise = authUser.user.role === 'PROFESSIONAL'
                ? authFetch(`/api/users/professionals/me`)
                : Promise.resolve(null);

            const [userData, professionalDataResponse] = await Promise.all([userDataPromise, professionalDataPromise]);
            const professionalSpecificData = professionalDataResponse || {};

            const dataToSet = {
                dni: userData.dni || '', fullName: userData.fullName || '',
                email: userData.email || '', phone: userData.phone || '',
                specialty: professionalSpecificData.specialty || '',
                description: professionalSpecificData.description || '',
                profileImageUrl: userData.profileImageUrl || '',
            };
            setProfileData(dataToSet);
            setInitialProfileData(dataToSet);
            setImagePreview(userData.profileImageUrl ? `${API_BASE_URL}${userData.profileImageUrl}` : '');
        } catch (err) {
            setError(err.message || "Error al cargar el perfil.");
        } finally {
            setLoading(false);
        }
    }, [authUser, loadingAuth]);

    useEffect(() => {
        fetchProfile();
    }, [fetchProfile]);

    const handleChange = (event) => {
        const { name, value } = event.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
        setError('');
    };
    
    const handleImageChange = (event) => {
        const file = event.target.files[0];
        if (file && file.type.startsWith('image/')) {
            setSelectedImageFile(file);
            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);
            setError('');
        } else {
            setSelectedImageFile(null);
            showNotification('Por favor, seleccione un archivo de imagen válido (jpg, png, gif).', 'error');
        }
    };

    const handleAvatarClick = () => {
        if (isEditing) {
            fileInputRef.current.click();
        }
    };

    const hasChanges = () => {
        return JSON.stringify(profileData) !== JSON.stringify(initialProfileData) || !!selectedImageFile;
    };

    const handleToggleEdit = () => {
        if (isEditing && hasChanges()) {
            if (window.confirm("Tiene cambios sin guardar. ¿Desea descartarlos?")) {
                setProfileData(initialProfileData);
                setSelectedImageFile(null);
                setImagePreview(initialProfileData.profileImageUrl ? `${API_BASE_URL}${initialProfileData.profileImageUrl}` : '');
                setError('');
                setIsEditing(false);
            }
        } else {
            setIsEditing(!isEditing);
            setError('');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!hasChanges()) {
            setIsEditing(false);
            return;
        }
        setLoading(true);
        setError('');

        const formData = new FormData();
        formData.append('fullName', profileData.fullName);
        formData.append('email', profileData.email);
        formData.append('phone', profileData.phone);
        if (authUser?.user?.role === 'PROFESSIONAL') {
            formData.append('specialty', profileData.specialty);
            formData.append('description', profileData.description);
        }
        if (selectedImageFile) {
            formData.append('profileImage', selectedImageFile);
        }

        try {
            const response = await authFetch('/api/users/me', {
                method: 'PUT',
                body: formData,
            });

            const updatedUserFromServer = response.user;

            if (updatedUserFromServer && authUser && updateAuthContextUser) {
                const updatedUserForContext = { ...authUser.user, ...updatedUserFromServer };
                updateAuthContextUser({ token: authUser.token, user: updatedUserForContext });
                
                const dataToSet = { ...profileData, ...updatedUserFromServer };
                setProfileData(dataToSet);
                setInitialProfileData(dataToSet);
                setImagePreview(updatedUserFromServer.profileImageUrl ? `${API_BASE_URL}${updatedUserFromServer.profileImageUrl}` : '');
            }
            
            showNotification('Perfil actualizado exitosamente', 'success');
            setIsEditing(false);
            setSelectedImageFile(null);

        } catch (err) {
            showNotification(err.message || 'Error al actualizar el perfil', 'error');
            fetchProfile();
        } finally {
            setLoading(false);
        }
    };

    const handleOpenPasswordModal = () => setOpenPasswordModal(true);
    const handleClosePasswordModal = () => {
        setOpenPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
        setPasswordErrors({});
    };

    const handlePasswordChange = (event) => {
        const { name, value } = event.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        if (passwordErrors[name]) setPasswordErrors(prev => ({ ...prev, [name]: null }));
    };

    const handlePasswordSubmit = async (event) => {
        event.preventDefault();
        const errors = {};
        if (!passwordData.currentPassword) errors.currentPassword = 'Requerido';
        if (!passwordData.newPassword) errors.newPassword = 'Requerido';
        if (passwordData.newPassword.length < 6) errors.newPassword = 'Debe tener al menos 6 caracteres.';
        if (passwordData.newPassword !== passwordData.confirmNewPassword) errors.confirmNewPassword = 'Las contraseñas no coinciden.';
        setPasswordErrors(errors);
        if (Object.keys(errors).length > 0) return;
        setPasswordLoading(true);
        try {
            await authFetch('/api/users/me/change-password', {
                method: 'PUT',
                body: JSON.stringify({ currentPassword: passwordData.currentPassword, newPassword: passwordData.newPassword }),
            });
            showNotification('Contraseña actualizada exitosamente.', 'success');
            handleClosePasswordModal();
        } catch (err) {
            showNotification(err.message || 'Error al cambiar la contraseña.', 'error');
            if (err.message.toLowerCase().includes('actual es incorrecta')) {
                setPasswordErrors(prev => ({...prev, currentPassword: err.message}));
            }
        } finally {
            setPasswordLoading(false);
        }
    };

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

    if (loadingAuth) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /><Typography sx={{ml: 2}}>Verificando autenticación...</Typography></Box>;
    if (error) return <Alert severity="warning" sx={{ m: 2 }}>{error}</Alert>;
    if (loading && !initialProfileData.dni) return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}><CircularProgress /><Typography sx={{ml: 2}}>Cargando perfil...</Typography></Box>;
    if (!authUser && !loadingAuth) return <Alert severity="error" sx={{ m: 2 }}>Error de autenticación. Por favor, intente iniciar sesión de nuevo.</Alert>;

    return (
        <>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3, md: 4 }, maxWidth: 700, margin: 'auto' }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>Mi Perfil Profesional</Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate>
                    <Grid container spacing={3} direction="column">
                        <Grid item xs={12} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/png, image/jpeg, image/gif" hidden />
                            <Badge
                                overlap="circular"
                                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                                badgeContent={ isEditing ? ( <IconButton sx={{ backgroundColor: 'rgba(255,255,255,0.7)', '&:hover': {backgroundColor: 'white'} }} size="small" onClick={handleAvatarClick}><PhotoCamera color="primary" /></IconButton>) : null }
                            >
                                <Avatar
                                    src={imagePreview}
                                    sx={{ width: 120, height: 120, mb: 1, fontSize: '3rem', bgcolor: 'primary.main', cursor: isEditing ? 'pointer' : 'default', border: '2px solid', borderColor: 'primary.main' }}
                                    onClick={handleAvatarClick}
                                >
                                    {!imagePreview && getInitials(profileData.fullName)}
                                </Avatar>
                            </Badge>
                        </Grid>
                        <Grid item xs={12}><TextField label="Usuario" value={profileData.dni} fullWidth InputProps={{ readOnly: true }} variant="filled" helperText="El usuario no puede ser modificado."/></Grid>
                        <Grid item xs={12}><TextField required fullWidth name="fullName" label="Nombre Completo" value={profileData.fullName} onChange={handleChange} disabled={!isEditing || loading} variant={isEditing ? "outlined" : "filled"} InputProps={{ readOnly: !isEditing }}/></Grid>
                        <Grid item xs={12}><TextField required fullWidth name="email" label="Correo Electrónico" type="email" value={profileData.email} onChange={handleChange} disabled={!isEditing || loading} variant={isEditing ? "outlined" : "filled"} InputProps={{ readOnly: !isEditing }}/></Grid>
                        <Grid item xs={12}><TextField fullWidth name="phone" label="Teléfono" value={profileData.phone} onChange={handleChange} disabled={!isEditing || loading} variant={isEditing ? "outlined" : "filled"} InputProps={{ readOnly: !isEditing }}/></Grid>
                        <Grid item xs={12}><TextField fullWidth name="specialty" label="Especialidad" value={profileData.specialty} onChange={handleChange} disabled={!isEditing || loading} variant={isEditing ? "outlined" : "filled"} InputProps={{ readOnly: !isEditing }}/></Grid>
                        <Grid item xs={12}><TextField fullWidth name="description" label="Descripción Profesional" multiline rows={4} value={profileData.description} onChange={handleChange} disabled={!isEditing || loading} variant={isEditing ? "outlined" : "filled"} InputProps={{ readOnly: !isEditing }}/></Grid>
                        <Grid item xs={12} sx={{ mt: 2 }}>
                            <Stack direction="row" spacing={2} justifyContent="flex-end" alignItems="center">
                                <Button variant="text" onClick={handleOpenPasswordModal} disabled={isEditing}>Cambiar Contraseña</Button>
                                <Button variant={isEditing ? "outlined" : "contained"} onClick={handleToggleEdit} startIcon={isEditing ? null : <EditIcon />} disabled={loading && isEditing}>{isEditing ? "Cancelar" : "Modificar Datos"}</Button>
                                {isEditing && (<Button type="submit" variant="contained" color="primary" disabled={loading || !hasChanges()} startIcon={loading ? <CircularProgress size={20} color="inherit"/> : null}>{loading ? 'Guardando...' : 'Guardar Cambios'}</Button>)}
                            </Stack>
                        </Grid>
                    </Grid>
                </Box>
            </Paper>
            <Dialog open={openPasswordModal} onClose={handleClosePasswordModal} maxWidth="xs" fullWidth>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogContent>
                    <Box component="form" id="password-form" onSubmit={handlePasswordSubmit} sx={{pt:1}}>
                        <TextField
                            autoFocus margin="normal" required fullWidth name="currentPassword" label="Contraseña Actual"
                            type={showPassword ? 'text' : 'password'} value={passwordData.currentPassword}
                            onChange={handlePasswordChange} error={!!passwordErrors.currentPassword}
                            helperText={passwordErrors.currentPassword} disabled={passwordLoading}
                            InputProps={{
                                endAdornment: ( <InputAdornment position="end"> <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>),
                            }}
                        />
                        <TextField
                            margin="normal" required fullWidth name="newPassword" label="Nueva Contraseña"
                            type={showPassword ? 'text' : 'password'} value={passwordData.newPassword}
                            onChange={handlePasswordChange} error={!!passwordErrors.newPassword}
                            helperText={passwordErrors.newPassword} disabled={passwordLoading}
                            InputProps={{
                                endAdornment: ( <InputAdornment position="end"> <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>),
                            }}
                        />
                        <TextField
                            margin="normal" required fullWidth name="confirmNewPassword" label="Confirmar Nueva Contraseña"
                            type={showPassword ? 'text' : 'password'} value={passwordData.confirmNewPassword}
                            onChange={handlePasswordChange} error={!!passwordErrors.confirmNewPassword}
                            helperText={passwordErrors.confirmNewPassword} disabled={passwordLoading}
                            InputProps={{
                                endAdornment: ( <InputAdornment position="end"> <IconButton aria-label="toggle password visibility" onClick={handleClickShowPassword} onMouseDown={handleMouseDownPassword} edge="end">{showPassword ? <VisibilityOff /> : <Visibility />}</IconButton></InputAdornment>),
                            }}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClosePasswordModal} disabled={passwordLoading}>Cancelar</Button>
                    <Button type="submit" form="password-form" variant="contained" disabled={passwordLoading}>
                        {passwordLoading ? <CircularProgress size={24} color="inherit" /> : 'Actualizar Contraseña'}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default ProfileView;