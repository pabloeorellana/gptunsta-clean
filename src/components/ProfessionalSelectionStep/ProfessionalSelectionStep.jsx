import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Grid, Card, CardContent, CardActions, Button,
    Avatar, CircularProgress, Alert, Box
} from '@mui/material';
import { API_BASE_URL } from '../../config';

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

const ProfessionalSelectionStep = ({ onSelectProfessional, preSelectedProfessionalId }) => {
    const [professionals, setProfessionals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchProfessionals = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetch(`${API_BASE_URL}/api/public/professionals`);
                if (!response.ok) {
                    throw new Error("No se pudieron cargar los profesionales disponibles.");
                }
                const data = await response.json();
                setProfessionals(data);

                if (preSelectedProfessionalId) {
                    const foundProf = data.find(p => p.id === preSelectedProfessionalId);
                    if (foundProf) {
                        onSelectProfessional(foundProf.id, foundProf.fullName);
                    } else {
                        setError("El profesional especificado en la URL no fue encontrado o no está activo.");
                    }
                }
            } catch (err) {
                console.error("Error fetching professionals:", err);
                setError(err.message || "Error al cargar la lista de profesionales. Intente más tarde.");
            } finally {
                setLoading(false);
            }
        };
        fetchProfessionals();
    }, [onSelectProfessional, preSelectedProfessionalId]);

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Cargando profesionales...</Typography>
            </Box>
        );
    }

    if (error) {
        return <Alert severity="error" sx={{ m: 2, textAlign: 'center' }}>{error}</Alert>;
    }

    if (professionals.length === 0) {
        return <Alert severity="info" sx={{ m: 2, textAlign: 'center' }}>No hay profesionales disponibles para reservar en este momento.</Alert>;
    }

    return (
        <Container sx={{ py: 4, textAlign: 'center' }}>
            <Typography variant="h4" gutterBottom>
                Seleccione un Profesional
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                Elija al profesional con quien desea agendar su turno.
            </Typography>
            <Grid container spacing={4} sx={{ mt: 2 }} justifyContent="center">
                {professionals.map((prof) => (
                    <Grid item key={prof.id} xs={12} sm={6} md={4}>
                        <Card sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                                <Avatar 
                                    src={prof.profileImageUrl ? `${API_BASE_URL}${prof.profileImageUrl}` : undefined} 
                                    alt={prof.fullName} 
                                    sx={{ width: 80, height: 80, margin: 'auto', mb: 2, fontSize: '2.5rem', bgcolor: 'secondary.main' }}
                                >
                                    {!prof.profileImageUrl && getInitials(prof.fullName)}
                                </Avatar>
                                <Typography gutterBottom variant="h5" component="h2">{prof.fullName}</Typography>
                                <Typography color="primary" sx={{mb:1}}>{prof.specialty}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{mt:1}}>{prof.description || 'Sin descripción.'}</Typography>
                            </CardContent>
                            <CardActions sx={{ justifyContent: 'center' }}>
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => onSelectProfessional(prof.id, prof.fullName)}
                                >
                                    Seleccionar Profesional
                                </Button>
                            </CardActions>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Container>
    );
};

export default ProfessionalSelectionStep;