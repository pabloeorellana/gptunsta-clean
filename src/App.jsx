import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
import LandingPage from './pages/LandingPage/LandingPage.jsx';

import ForgotPasswordPage from './pages/ForgotPasswordPage/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage/ResetPasswordPage.jsx';
import AppointmentBookingPage from './pages/AppointmentBookingPage/AppointmentBookingPage.jsx';
import ProfessionalLoginPage from './pages/ProfessionalLoginPage/ProfessionalLoginPage.jsx';
import ProfessionalDashboardLayout from './pages/ProfessionalDashboardPage/ProfessionalDashboardLayout.jsx';
import AdminDashboardLayout from './pages/AdminDashboardPage/AdminDashboardLayout.jsx';

const theme = createTheme({
    palette: {
        primary: {
            main: '#194da0',
            light: '#469cfb',
            dark: '#2e5ec0',
            contrastText: '#ffffff',
        },
        secondary: {
            main: '#f57c00',
            contrastText: '#ffffff',
        },
    },
});

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { authUser, isAuthenticated, loadingAuth } = useAuth();

    if (loadingAuth) {
        return <Typography sx={{ p: 3, textAlign: 'center' }}>Verificando autenticación...</Typography>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/profesional/login" replace />;
    }
    if (allowedRoles && !allowedRoles.includes(authUser.user.role)) {
        return <Navigate to="/profesional/dashboard/agenda" replace />;
    }

    return children;
};

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <BrowserRouter>
                <NotificationProvider>
                    <AuthProvider>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/reservar-turno" element={<AppointmentBookingPage />} />
                            <Route path="/reservar-turno/:professionalId" element={<AppointmentBookingPage />} />
                            <Route path="/profesional/login" element={<ProfessionalLoginPage />} />                
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                            <Route
                                path="/profesional/dashboard/*"
                                element={
                                    <ProtectedRoute allowedRoles={['PROFESSIONAL', 'ADMIN']}>
                                        <ProfessionalDashboardLayout />
                                    </ProtectedRoute>
                                }
                            />
                            <Route
                                path="/admin/dashboard/*"
                                element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <AdminDashboardLayout />
                                    </ProtectedRoute>
                                }
                            />
                            <Route path="*" element={<Typography sx={{p:3, textAlign:'center'}}><h2>404</h2><p>Página no encontrada</p></Typography>} />
                        </Routes>
                    </AuthProvider>
                </NotificationProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;