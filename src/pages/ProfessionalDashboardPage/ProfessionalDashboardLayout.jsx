import React, { useState, useEffect } from 'react';
import { Routes, Route, Link as RouterLink, Navigate, useNavigate } from 'react-router-dom';
import {
    AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
    Divider, Tooltip, Avatar, Menu, MenuItem, Badge, Stack, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import EventIcon from '@mui/icons-material/Event';
import ScheduleSendIcon from '@mui/icons-material/ScheduleSend';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LogoutIcon from '@mui/icons-material/Logout';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import { useAuth } from '../../context/AuthContext';
import authFetch from '../../utils/authFetch';
import { DateTime } from 'luxon';
import { API_BASE_URL } from '../../config';

import AppointmentsView from './views/AppointmentsView.jsx';
import AvailabilityView from './views/AvailabilityView.jsx';
import PatientsView from './views/PatientsView.jsx';
import ProfileView from './views/ProfileView.jsx';
import StatisticsView from './views/StatisticsView.jsx';

const drawerWidth = 240;

const ProfessionalDashboardLayout = (props) => {
    const { window } = props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const navigate = useNavigate();
    const { authUser, logout } = useAuth();
    const [anchorElUser, setAnchorElUser] = useState(null);
    const [anchorElNotifications, setAnchorElNotifications] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    useEffect(() => {
        const fetchNotifications = async () => {
            if (!authUser) return;
            try {
                const data = await authFetch('/api/notifications');
                setNotifications(data.notifications || []);
                setUnreadNotifications(data.unreadCount || 0);
            } catch (error) {
                console.error("Error al obtener notificaciones:", error);
            }
        };
        fetchNotifications();
        const intervalId = setInterval(fetchNotifications, 30000);
        return () => clearInterval(intervalId);
    }, [authUser]);

    const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);

    const handleOpenNotificationsMenu = (event) => {
        setAnchorElNotifications(event.currentTarget);
        if (unreadNotifications > 0) {
            authFetch('/api/notifications/mark-as-read', { method: 'PUT' })
                .then(() => setUnreadNotifications(0))
                .catch(err => console.error("Error al marcar notificaciones como leídas:", err));
        }
    };
    const handleCloseNotificationsMenu = () => setAnchorElNotifications(null);

    const handleDrawerToggle = () => {
        if (!isClosing) {
            setMobileOpen(!mobileOpen);
        }
    };

    const handleDrawerClose = () => {
        setIsClosing(true);
        setMobileOpen(false);
    };

    const handleDrawerTransitionEnd = () => {
        setIsClosing(false);
    };

    const handleLogout = () => {
        handleCloseUserMenu();
        logout();
    };

    const handleGoToProfile = () => {
        handleCloseUserMenu();
        navigate('/profesional/dashboard/perfil');
    };

    const menuItems = [
        { text: 'Agenda', icon: <EventIcon />, path: 'agenda' },
        { text: 'Disponibilidad', icon: <ScheduleSendIcon />, path: 'disponibilidad' },
        { text: 'Pacientes', icon: <PeopleIcon />, path: 'pacientes' },
        { text: 'Estadísticas', icon: <AssessmentIcon />, path: 'estadisticas' },
        { text: 'Mi Perfil', icon: <AccountCircleIcon />, path: 'perfil' },
    ];

    const getInitials = (name) => {
        if (!name) return '';
        const nameParts = name.split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const professionalName = authUser?.user?.fullName || "Profesional";
    const professionalAvatarUrl = authUser?.user?.profileImageUrl 
        ? `${API_BASE_URL}${authUser.user.profileImageUrl}` 
        : undefined;

    const drawer = (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Gestión de Pacientes y Turnos UNSTA
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {menuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={RouterLink}
                            to={`/profesional/dashboard/${item.path}`}
                            onClick={mobileOpen ? handleDrawerToggle : undefined}
                        >
                            <ListItemIcon>{item.icon}</ListItemIcon>
                            <ListItemText primary={item.text} />
                        </ListItemButton>
                    </ListItem>
                ))}
            </List>
            <Divider sx={{ mt: 'auto' }} />
            <List>
                <ListItem disablePadding>
                    <ListItemButton onClick={handleLogout}>
                        <ListItemIcon><LogoutIcon /></ListItemIcon>
                        <ListItemText primary="Cerrar Sesión" />
                    </ListItemButton>
                </ListItem>
            </List>
        </div>
    );

    const container = window !== undefined ? () => window().document.body : undefined;

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
                <Toolbar>
                    <IconButton color="inherit" aria-label="open drawer" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2, display: { sm: 'none' } }}>
                        <MenuIcon />
                    </IconButton>
                    <Box component={RouterLink} to="/profesional/dashboard/agenda" sx={{ display: 'flex', alignItems: 'center', textDecoration: 'none', color: 'inherit' }}>
                        <Box component="img" src="/logo-unsta-white.png" sx={{ height: '36px', mr: 1.5 }} />
                        <Typography variant="h6" noWrap sx={{ display: { xs: 'none', sm: 'block' } }}>
                            Gestión de Pacientes y Turnos UNSTA
                        </Typography>
                    </Box>
                    <Box sx={{ flexGrow: 1 }} />
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Tooltip title="Notificaciones">
                            <IconButton color="inherit" onClick={handleOpenNotificationsMenu}>
                                <Badge badgeContent={unreadNotifications} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Opciones de Usuario">
                            <Button
                                onClick={handleOpenUserMenu}
                                sx={{ p: 0.5, color: 'inherit', textTransform: 'none', borderRadius: '16px' }}
                                startIcon={
                                    <Avatar
                                        alt={professionalName}
                                        src={professionalAvatarUrl}
                                        sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}
                                    >
                                        {!professionalAvatarUrl && getInitials(professionalName)}
                                    </Avatar>
                                }
                            >
                                <Typography sx={{ display: { xs: 'none', md: 'block' }, ml: 0.5 }}>
                                    {professionalName}
                                </Typography>
                            </Button>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            anchorEl={anchorElUser}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            keepMounted
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            open={Boolean(anchorElUser)}
                            onClose={handleCloseUserMenu}
                        >
                            <MenuItem onClick={handleGoToProfile}>
                                <ListItemIcon><AccountCircleIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Mi Perfil</ListItemText>
                            </MenuItem>
                            <MenuItem onClick={handleLogout}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Cerrar Sesión</ListItemText>
                            </MenuItem>
                        </Menu>
                        <Menu
                            sx={{ mt: '45px' }}
                            anchorEl={anchorElNotifications}
                            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                            keepMounted
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            open={Boolean(anchorElNotifications)}
                            onClose={handleCloseNotificationsMenu}
                            PaperProps={{ style: { width: 350, maxHeight: 400 } }}
                        >
                            <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                                <Typography variant="h6" component="div">Notificaciones</Typography>
                            </Box>
                            {notifications.length > 0 ? (
                                notifications.map(notification => (
                                    <MenuItem key={notification.id} onClick={handleCloseNotificationsMenu} component={RouterLink} to={notification.link || '#'}>
                                        <ListItemIcon><EventAvailableIcon fontSize="small" color={notification.isRead ? 'inherit' : 'primary'} /></ListItemIcon>
                                        <ListItemText
                                            primary={notification.message}
                                            secondary={DateTime.fromISO(notification.createdAt).setLocale('es').toRelative()}
                                            primaryTypographyProps={{ style: { fontWeight: notification.isRead ? 400 : 600, whiteSpace: 'normal' } }}
                                        />
                                    </MenuItem>
                                ))
                            ) : (
                                <MenuItem onClick={handleCloseNotificationsMenu}>
                                    <ListItemText primary="No hay notificaciones nuevas." />
                                </MenuItem>
                            )}
                        </Menu>
                    </Stack>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="mailbox folders"
            >
                <Drawer
                    container={container}
                    variant="temporary"
                    open={mobileOpen}
                    onTransitionEnd={handleDrawerTransitionEnd}
                    onClose={handleDrawerClose}
                    ModalProps={{ keepMounted: true }}
                    sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
                >
                    {drawer}
                </Drawer>
                <Drawer
                    variant="permanent"
                    sx={{ display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth } }}
                    open
                >
                    {drawer}
                </Drawer>
            </Box>
            <Box
                component="main"
                sx={{ flexGrow: 1, p: 3, width: { sm: `calc(100% - ${drawerWidth}px)` } }}
            >
                <Toolbar />
                <Routes>
                    <Route path="/" element={<Navigate to="agenda" replace />} />
                    <Route path="agenda" element={<AppointmentsView />} />
                    <Route path="disponibilidad" element={<AvailabilityView />} />
                    <Route path="pacientes" element={<PatientsView />} />
                    <Route path="estadisticas" element={<StatisticsView />} />
                    <Route path="perfil" element={<ProfileView />} />
                </Routes>
            </Box>
        </Box>
    );
};

export default ProfessionalDashboardLayout;