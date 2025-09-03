import React, { useState } from 'react';
import { Container, Box, Typography, TextField, Button, Paper, Alert, CircularProgress } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { API_BASE_URL } from '../../config';

const ForgotPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setMessage('');
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Error al enviar la solicitud.');
            }
            setMessage(data.message);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Container component="main" maxWidth="xs" sx={{ mt: 8 }}>
            <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">Recuperar Contraseña</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                    Ingrese su correo electrónico y le enviaremos un enlace para restablecer su contraseña.
                </Typography>
                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal" required fullWidth id="email" label="Correo Electrónico"
                        name="email" autoComplete="email" autoFocus
                        value={email} onChange={(e) => setEmail(e.target.value)}
                        disabled={loading || !!message}
                    />
                    {message && <Alert severity="success" sx={{ width: '100%', mt: 2 }}>{message}</Alert>}
                    {error && <Alert severity="error" sx={{ width: '100%', mt: 2 }}>{error}</Alert>}
                    <Button
                        type="submit" fullWidth variant="contained"
                        sx={{ mt: 3, mb: 2 }} disabled={loading || !!message}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Enviar Enlace'}
                    </Button>
                    <Button component={RouterLink} to="/profesional/login" fullWidth>
                        Volver a Iniciar Sesión
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default ForgotPasswordPage;