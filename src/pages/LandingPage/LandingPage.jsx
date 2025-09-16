import React, { useState, useEffect, useRef } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Box, Typography, Button, Container, AppBar, Toolbar, Grid, List, ListItem, ListItemIcon, ListItemText, IconButton } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import FacebookIcon from '@mui/icons-material/Facebook';
import TwitterIcon from '@mui/icons-material/Twitter';
import InstagramIcon from '@mui/icons-material/Instagram';
import LinkedInIcon from '@mui/icons-material/LinkedIn';

import backgroundImage from '/background.jpg';
import logoUnsta from '/logo.png';

const useOnScreen = (options) => {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setIsVisible(true);
                observer.unobserve(entry.target);
            }
        }, options);

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [ref, options]);

    return [ref, isVisible];
};

const AnimatedSection = ({ children }) => {
    const [ref, isVisible] = useOnScreen({ threshold: 0.2 });
    return (
        <Box
            ref={ref}
            sx={{
                transition: 'opacity 0.8s ease-out, transform 0.8s ease-out',
                opacity: isVisible ? 1 : 0,
                transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
            }}
        >
            {children}
        </Box>
    );
};

const LandingPage = () => {
    return (
        <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff' }}>
            <AppBar position="static" color="primary" sx={{ boxShadow: 1 }}>
                <Toolbar>
                    <img src={logoUnsta} alt="Logo UNSTA" style={{ height: '40px', marginRight: '16px' }} />
                </Toolbar>
            </AppBar>
            <Box
                sx={{
                    position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', color: 'white', 
                    height: '80vh',
                    backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
                    '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(rgba(0, 0, 0, 0.5), rgba(0, 0, 0, 0.5))', zIndex: 0, },
                    '& > *': { position: 'relative', zIndex: 1, },
                }}
            >
                <Container maxWidth="md">
                    <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold', textShadow: '2px 2px 4px rgba(0,0,0,0.7)' }}>
                        Consultorio Nutricional UNSTA
                    </Typography>
                    <Typography variant="h5" sx={{ mb: 4, textShadow: '1px 1px 3px rgba(0,0,0,0.7)' }}>
                        Un espacio de atención en salud alimentaria pensado para la comunidad universitaria
                    </Typography>
                    
                    <Grid container spacing={2} justifyContent="center">
                        <Grid item>
                            <Button component={RouterLink} to="/reservar-turno" variant="contained" color="primary" size="large" sx={{ px: 4, py: 1.5 }}>
                                Solicitar Turno
                            </Button>
                        </Grid>
                        <Grid item>
                            <Button component={RouterLink} to="/profesional/login" variant="outlined" color="inherit" size="large" sx={{ px: 4, py: 1.5, color: 'white', borderColor: 'white', '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.1)', borderColor: 'white', }}}>
                                Acceso Profesionales
                            </Button>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
            
            <Box component="main">
                {/* --- NUEVA SECCIÓN: ¿QUÉ ES EL CONSULTORIO? --- */}
                <Box sx={{ py: 8, backgroundColor: '#ffffff' }}>
                    <Container maxWidth="lg">
                        <AnimatedSection>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row-reverse' }, alignItems: 'center', gap: 6 }}>
                                <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { xs: 0, md: 3 } }}>
                                    <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        ¿Qué es el Consultorio Nutricional?
                                    </Typography>
                                        <Typography paragraph color="text.secondary">
                                        Un proyecto de la Facultad de Ciencias de la Salud que vincula la formación académica de nuestros futuros nutricionistas con un servicio esencial para la comunidad.
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Nuestra mision: Ofrecer atención nutricional de alta calidad, accesible y personalizada, promoviendo hábitos saludables y previniendo enfermedades. Servimos como un espacio de práctica profesional supervisada para los estudiantes avanzados de la carrera de Nutrición, garantizando un servicio innovador y basado en la última evidencia científica.
                                    </Typography>
                                    <Typography paragraph color="text.secondary">
                                        Desde la planificación de dietas específicas hasta la educación alimentaria general, nuestro objetivo es empoderar a cada paciente para que tome el control de su bienestar a través de la nutrición.
                                    </Typography>
                                </Box>
                                <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { xs: 0, md: 3 } }}>
                                    <Box component="img" src="https://media.istockphoto.com/id/1321112364/es/foto/nutricionista-mujer-con-laptop-da-consulta-a-paciente-en-interiores-en-la-oficina.jpg?s=612x612&w=0&k=20&c=eVS041CQYcUKKz6iP8rxFS50k30wUOkvhj7UeBAe30o=" alt="Profesional de la nutrición" sx={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '12px', boxShadow: 3 }} />
                                </Box>
                            </Box>
                        </AnimatedSection>
                    </Container>
                </Box>

                {/* --- SECCIÓN 2: BENEFICIOS PARA TU SALUD (antes era la 1) --- */}
                <Box sx={{ py: 8, backgroundColor: '#f5f5f5' }}>
                    <Container maxWidth="lg">
                        <AnimatedSection>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', gap: 6 }}>
                                <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { xs: 0, md: 3 } }}>
                                    <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        Beneficios para tu Salud
                                    </Typography>
                                    <List>
                                        <ListItem><ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon><ListItemText primary="Planes Nutricionales Personalizados" secondary="Adaptados a tus objetivos, estilo de vida y necesidades médicas." /></ListItem>
                                        <ListItem><ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon><ListItemText primary="Seguimiento Profesional Continuo" secondary="Nuestros expertos te acompañan en cada paso de tu progreso." /></ListItem>
                                        <ListItem><ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon><ListItemText primary="Educación Alimentaria" secondary="Aprende a tomar decisiones saludables y a crear hábitos duraderos." /></ListItem>
                                        <ListItem><ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon><ListItemText primary="Acceso Fácil y Rápido" secondary="Agenda tus turnos online en segundos, desde cualquier lugar." /></ListItem>
                                    </List>
                                </Box>
                                <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { xs: 0, md: 3 } }}>
                                    <Box component="img" src="https://media.istockphoto.com/id/1492641547/es/foto/concepto-detox-mujer-afro-paciente-de-nutricionista-bebiendo-agua-de-lim%C3%B3n-mientras-el-m%C3%A9dico.jpg?s=612x612&w=0&k=20&c=mR_9GN-cg86nJwwNgT59JiTyT3AggPp24K7VFlyNywo=" alt="Nutrición y salud" sx={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '12px', boxShadow: 3 }} />
                                </Box>
                            </Box>
                        </AnimatedSection>
                    </Container>
                </Box>
                <Box sx={{ py: 8, backgroundColor: '#ffffff' }}>
                    <Container maxWidth="lg">
                        <AnimatedSection>
                            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row-reverse' }, alignItems: 'center', gap: 6 }}>
                                <Box sx={{ width: { xs: '100%', md: '50%' }, pl: { xs: 0, md: 3 } }}>
                                    <Typography variant="h3" component="h2" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                        Orientación Vocacional
                                    </Typography>
                                    <List>
                                        <ListItem><ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon><ListItemText primary="Conoce la Carrera de Nutrición" secondary="Descubre el campo de acción y las oportunidades de la profesión." /></ListItem>
                                        <ListItem><ListItemIcon><CheckCircleOutlineIcon color="primary" /></ListItemIcon><ListItemText primary="Prácticas Supervisadas" secondary="Nuestros estudiantes realizan sus prácticas en el consultorio, brindando un servicio a la comunidad." /></ListItem>
                                    </List>
                                </Box>
                                <Box sx={{ width: { xs: '100%', md: '50%' }, pr: { xs: 0, md: 3 } }}>
                                    <Box component="img" src="https://www.unsta.edu.ar/wp-content/uploads/2023/08/JORNADA-DE-NUTRICION_web-1536x852.jpg" alt="Orientación vocacional" sx={{ width: '100%', height: 'auto', objectFit: 'cover', borderRadius: '12px', boxShadow: 3 }} />
                                </Box>
                            </Box>
                        </AnimatedSection>
                    </Container>
                </Box>
            </Box>
            <Box component="footer" sx={{ backgroundColor: '#333333', color: '#ffffff', py: 6 }}>
                <Container maxWidth="lg">
                    <Grid container spacing={4} justifyContent="flex-start">
                        <Grid item xs={12} sm={6} md={4}>
                            <Typography variant="h6" gutterBottom sx={{ borderBottom: '2px solid #194da0', pb: 1, mb: 2 }}>Campus UNSTA Yerba Buena</Typography>
                            <List dense>
                                <ListItem disableGutters><ListItemIcon sx={{ minWidth: '40px' }}><PlaceIcon sx={{ color: 'white' }} /></ListItemIcon><ListItemText primary="Av. Pdte. Perón 2085" /></ListItem>
                                <ListItem disableGutters><ListItemIcon sx={{ minWidth: '40px' }}><EmailIcon sx={{ color: 'white' }} /></ListItemIcon><ListItemText primary="consultorio.nutricional@unsta.edu.ar" /></ListItem>
                                <ListItem disableGutters><ListItemIcon sx={{ minWidth: '40px' }}><PhoneIcon sx={{ color: 'white' }} /></ListItemIcon><ListItemText primary="0381 410 1188" /></ListItem>
                            </List>
                        </Grid>
                        <Grid item xs={12} sm={6} md={4}>
                             <Typography variant="h6" gutterBottom sx={{ borderBottom: '2px solid #194da0', pb: 1, mb: 2 }}>Redes Sociales</Typography>
                             <Box>
                                <IconButton href="#" sx={{ color: 'white' }}><FacebookIcon /></IconButton>
                                <IconButton href="#" sx={{ color: 'white' }}><TwitterIcon /></IconButton>
                                <IconButton href="#" sx={{ color: 'white' }}><InstagramIcon /></IconButton>
                                <IconButton href="#" sx={{ color: 'white' }}><LinkedInIcon /></IconButton>
                            </Box>
                        </Grid>
                    </Grid>
                </Container>
            </Box>
            <Box sx={{ backgroundColor: '#222222', color: '#aaaaaa', py: 2, textAlign: 'center' }}>
                <Typography variant="body2">GPT UNSTA 2025 - Todos los derechos reservados.</Typography>
            </Box>

        </Box>
    );
};

export default LandingPage;