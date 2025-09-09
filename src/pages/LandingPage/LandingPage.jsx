import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    Button,
    Container,
    AppBar,
    Toolbar,
    Paper,
    Grid
} from '@mui/material';

// --- (CORREGIDO) Importamos las imágenes desde la carpeta 'public' ---
import backgroundImage from '/background.jpg';
import logoUnsta from '/logo.png';

const LandingPage = () => {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            {/* --- BARRA DE NAVEGACIÓN SUPERIOR (CORREGIDA) --- */}
            {/* Usamos 'color="primary"' para que tome el color azul de tu tema */}
            <AppBar position="static" color="primary" sx={{ boxShadow: 1 }}>
                <Toolbar>
                    {/* El logo ahora se carga localmente */}
                    <img src={logoUnsta} alt="Logo UNSTA" style={{ height: '40px', marginRight: '16px' }} />
                </Toolbar>
            </AppBar>

            {/* --- SECCIÓN PRINCIPAL (HERO) --- */}
            <Box
sx={{
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    color: 'white',
    height: '60vh',
    // --- CÓDIGO CORREGIDO ---
    // Primero, establecemos la imagen de fondo directamente en el Box.
    backgroundImage: `url(${backgroundImage})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    // Luego, usamos el pseudo-elemento '::before' para superponer
    // una capa oscura semitransparente.
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        // Este degradado va de negro semitransparente a negro semitransparente.
        // Es una forma eficiente de crear una capa de color sólido.
        // Puedes ajustar '0.5' a '0.6' para hacerlo más oscuro, o '0.4' para más claro.
        background: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))',
        zIndex: 0, // Lo ponemos detrás del texto
    },
    // Nos aseguramos de que el contenido (el texto y los botones)
    // esté por encima de la capa oscura.
    '& > *': {
        position: 'relative',
        zIndex: 1,
    },
}}
            >
                <Container maxWidth="md">
                    <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
                        Consultorio Nutricional UNSTA
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 4, textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
                        Gestiona tus turnos y tu salud de manera fácil y segura.
                    </Typography>
                    
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item>
                            <Button
                                component={RouterLink}
                                to="/reservar-turno"
                                variant="contained"
                                color="primary"
                                size="large"
                                sx={{ px: 4, py: 1.5 }}
                            >
                                Solicitar Turno
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button
                                component={RouterLink}
                                to="/profesional/login"
                                variant="outlined"
                                color="inherit"
                                size="large"
                                sx={{ 
                                    px: 4, py: 1.5, 
                                    color: 'white', 
                                    borderColor: 'white', 
                                    '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                        borderColor: 'white',
                                    }
                                }}
                            >
                                Acceso Profesionales
                            </Button>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
            
            {/* --- SECCIÓN INFERIOR (Opcional) --- */}
            <Container sx={{ py: 6, flexGrow: 1, backgroundColor: '#f5f5f5' }}>
                <Grid container spacing={4} justifyContent="center" textAlign="center">
                    <Grid item xs={12} sm={4}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6">Beneficios</Typography>
                            <Typography>Accede a planes nutricionales personalizados y seguimiento profesional.</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6">Orientación Vocacional</Typography>
                            <Typography>Conoce más sobre la carrera de Nutrición y el rol de nuestros profesionales.</Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Typography variant="h6">Novedades Académicas</Typography>
                            <Typography>Mantente al día con las últimas noticias y eventos de la facultad.</Typography>
                        </Paper>
                    </Grid>
                </Grid>
            </Container>
        </Box>
    );
};

export default LandingPage;