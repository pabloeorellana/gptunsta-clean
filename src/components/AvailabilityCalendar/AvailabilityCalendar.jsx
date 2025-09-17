import React, { useState, useEffect } from 'react';
import { Grid, Paper, Typography, Button, CircularProgress, Alert, Box } from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { StaticDatePicker } from '@mui/x-date-pickers/StaticDatePicker';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { API_BASE_URL } from '../../config';

const AvailabilityCalendar = ({ onSlotSelect, professionalId }) => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [availableSlots, setAvailableSlots] = useState([]);
    const [loadingSlots, setLoadingSlots] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!selectedDate || !professionalId) return;
        setLoadingSlots(true);
        setError(null);
        setAvailableSlots([]);

        const dateKey = format(selectedDate, 'yyyy-MM-dd');

        fetch(`${API_BASE_URL}/api/public/availability?date=${dateKey}&professionalId=${professionalId}`)
            .then(response => {
                if (!response.ok) throw new Error(`Error del servidor al obtener horarios.`);
                return response.json();
            })
            .then(data => { setAvailableSlots(data || []); })
            .catch(err => {
                console.error("Error al obtener horarios:", err);
                setError('No se pudieron cargar los horarios. Intente más tarde.');
            })
            .finally(() => { setLoadingSlots(false); });
    }, [selectedDate, professionalId]);

    const handleDateChange = (newDate) => { setSelectedDate(newDate); };

    const handleSlotClick = (slot) => {
        const selectedDateTime = new Date(selectedDate);
        const [hours, minutes] = slot.split(':');
        selectedDateTime.setHours(parseInt(hours, 10));
        selectedDateTime.setMinutes(parseInt(minutes, 10));
        selectedDateTime.setSeconds(0);
        selectedDateTime.setMilliseconds(0);
        onSlotSelect(selectedDateTime);
    };

    const shouldDisableDate = (date) => {
        if (!date) return false;
        const day = date.getDay();
        return day === 0;
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3, alignItems: 'stretch' }}>
                <Paper elevation={3} sx={{ p: 2, width: { xs: '100%', md: 'auto' }, flexShrink: 0 }}>
                    <Typography variant="h6" gutterBottom component="div" sx={{ textAlign: 'center', mb: 2 }}>
                        Seleccione una Fecha
                    </Typography>
                    <StaticDatePicker
                        displayStaticWrapperAs="desktop"
                        openTo="day"
                        value={selectedDate}
                        onChange={handleDateChange}
                        shouldDisableDate={shouldDisableDate}
                        minDate={new Date()}
                        sx={{ '& .MuiCalendarPicker-root': { width: '100%' } }}
                    />
                </Paper>
                <Paper 
                    elevation={3} 
                    sx={{ p: 2, flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
                >
                    <Typography variant="h6" gutterBottom component="div" sx={{ textAlign: 'center', mb: 2, flexShrink: 0 }}>
                        Horarios para {selectedDate ? selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' }) : ''}
                    </Typography>
                    
                    <Box sx={{ flexGrow: 1, overflowY: 'auto', pr: 1 }}>
                        {loadingSlots && <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}><CircularProgress /></Box>}
                        {error && <Alert severity="error">{error}</Alert>}
                        {!loadingSlots && !error && (
                            <Grid container spacing={1.5}>
                                {availableSlots.length > 0 ? (
                                    availableSlots.map((slot, index) => (
                                        <Grid item xs={4} sm={3} key={slot}>
                                            <Button
                                                variant="outlined"
                                                fullWidth
                                                onClick={() => handleSlotClick(slot)}
                                                sx={{ 
                                                    py: 1.5,
                                                    opacity: 0,
                                                    animation: `fadeInUp 0.3s ease-out ${index * 0.05}s forwards`
                                                }}
                                            >
                                                {slot}
                                            </Button>
                                        </Grid>
                                    ))
                                ) : (
                                    <Typography sx={{ p: 2, textAlign: 'center', width: '100%', mt: 4, color: 'text.secondary' }}>
                                        No hay horarios disponibles para esta fecha.
                                    </Typography>
                                )}
                            </Grid>
                        )}
                    </Box>
                </Paper>
            </Box>
            <style>
                {`
                    @keyframes fadeInUp {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </LocalizationProvider>
    );
};

export default AvailabilityCalendar;