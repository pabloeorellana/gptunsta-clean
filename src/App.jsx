import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { NotificationProvider } from './context/NotificationContext.jsx';
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

// Componente para Proteger Rutas de Profesional y Admin
const ProtectedRoute = ({ children, allowedRoles }) => {
    const { authUser, isAuthenticated, loadingAuth } = useAuth();

    if (loadingAuth) {
        // Muestra un loader mientras se verifica la autenticación inicial
        return <Typography sx={{ p: 3, textAlign: 'center' }}>Verificando autenticación...</Typography>;
    }

    if (!isAuthenticated) {
        // Si no está autenticado, redirige a la página de login
        return <Navigate to="/profesional/login" replace />;
    }

    // Si la ruta requiere roles específicos y el rol del usuario no está permitido
    if (allowedRoles && !allowedRoles.includes(authUser.user.role)) {
        // Redirige a una página de "no autorizado" o de vuelta a la agenda del profesional como fallback
        // Esto previene que un 'PROFESSIONAL' acceda a '/admin/dashboard'
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
                            {/* --- Rutas Públicas para Pacientes --- */}
                            <Route path="/" element={<AppointmentBookingPage />} />
                            <Route path="/reservar/:professionalId" element={<AppointmentBookingPage />} />
                            <Route path="/profesional/login" element={<ProfessionalLoginPage />} />                
                            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                            <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

                            {/* --- Rutas Protegidas para Profesionales --- */}
                            <Route
                                path="/profesional/dashboard/*"
                                element={
                                    <ProtectedRoute allowedRoles={['PROFESSIONAL', 'ADMIN']}>
                                        <ProfessionalDashboardLayout />
                                    </ProtectedRoute>
                                }
                            />

                            {/* --- Rutas Protegidas para Administradores --- */}
                            <Route
                                path="/admin/dashboard/*"
                                element={
                                    <ProtectedRoute allowedRoles={['ADMIN']}>
                                        <AdminDashboardLayout />
                                    </ProtectedRoute>
                                }
                            />

                            {/* --- Ruta para Página No Encontrada (404) --- */}
                            <Route path="*" element={<Typography sx={{p:3, textAlign:'center'}}><h2>404</h2><p>Página no encontrada</p></Typography>} />
                        </Routes>
                    </AuthProvider>
                </NotificationProvider>
            </BrowserRouter>
        </ThemeProvider>
    );
}

export default App;