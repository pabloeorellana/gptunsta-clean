import React, { useState } from 'react';
import { Routes, Route, Link as RouterLink, Navigate } from 'react-router-dom';
import {
    AppBar, Box, CssBaseline, Drawer, IconButton, List, ListItem,
    ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography,
    Divider, Tooltip, Avatar, Menu, MenuItem, Badge, Stack, Button
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import GroupIcon from '@mui/icons-material/Group';
import LogoutIcon from '@mui/icons-material/Logout';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import GroupsIcon from '@mui/icons-material/Groups';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import ClassIcon from '@mui/icons-material/Class';
import { useAuth } from '../../context/AuthContext';

import UserManagementView from './views/UserManagementView.jsx';
import AdminAppointmentsView from './views/AdminAppointmentsView.jsx';
import AdminPatientsView from './views/AdminPatientsView.jsx';
import AdminStatisticsView from './views/AdminStatisticsView.jsx';
import CatalogManagementView from './views/CatalogManagementView.jsx';

const drawerWidth = 240;

const AdminDashboardLayout = (props) => {
    const { window } = props;
    const [mobileOpen, setMobileOpen] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const { authUser, logout } = useAuth();
    const [anchorElUser, setAnchorElUser] = useState(null);

    const handleOpenUserMenu = (event) => setAnchorElUser(event.currentTarget);
    const handleCloseUserMenu = () => setAnchorElUser(null);

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

    const adminMenuItems = [
        { text: 'Gestión de Usuarios', icon: <GroupIcon />, path: 'users' },
        { text: 'Agenda Global', icon: <CalendarMonthIcon />, path: 'agenda' },
        { text: 'Pacientes Globales', icon: <GroupsIcon />, path: 'pacientes' },
        { text: 'Estadísticas Globales', icon: <QueryStatsIcon />, path: 'estadisticas' },
        { text: 'Gestión de Catálogos', icon: <ClassIcon />, path: 'catalogs' },
    ];
    
    const getInitials = (name) => {
        if (!name) return 'A';
        const nameParts = name.split(' ');
        if (nameParts.length > 1) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };
    
    const adminName = authUser?.user?.fullName || "Admin";

    const drawer = (
        <div>
            <Toolbar>
                <Typography variant="h6" noWrap component="div">
                    Panel Admin
                </Typography>
            </Toolbar>
            <Divider />
            <List>
                {adminMenuItems.map((item) => (
                    <ListItem key={item.text} disablePadding>
                        <ListItemButton
                            component={RouterLink}
                            to={`/admin/dashboard/${item.path}`}
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
                    <ListItemButton onClick={logout}>
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
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        edge="start"
                        onClick={handleDrawerToggle}
                        sx={{ mr: 2, display: { sm: 'none' } }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                        Administración de Gestión de Pacientes y Turnos UNSTA
                    </Typography>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Tooltip title="Notificaciones">
                            <IconButton color="inherit">
                                <Badge badgeContent={0} color="error">
                                    <NotificationsIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Opciones de Administrador">
                            <Button
                                onClick={handleOpenUserMenu}
                                sx={{ p: 0.5, color: 'inherit', textTransform: 'none', borderRadius: '16px' }}
                                startIcon={
                                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                                        {getInitials(adminName)}
                                    </Avatar>
                                }
                            >
                                <Typography sx={{ display: { xs: 'none', md: 'block' }, ml: 0.5 }}>
                                    {adminName}
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
                            <MenuItem onClick={handleLogout}>
                                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
                                <ListItemText>Cerrar Sesión</ListItemText>
                            </MenuItem>
                        </Menu>
                    </Stack>
                </Toolbar>
            </AppBar>
            <Box
                component="nav"
                sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
                aria-label="admin navigation"
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
                    <Route path="users" element={<UserManagementView />} />
                    <Route path="agenda" element={<AdminAppointmentsView />} />
                    <Route path="pacientes" element={<AdminPatientsView />} />
                    <Route path="estadisticas" element={<AdminStatisticsView />} />
                    <Route path="catalogs" element={<CatalogManagementView />} /> 
                </Routes>
            </Box>
        </Box>
    );
};

export default AdminDashboardLayout;