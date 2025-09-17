import React, { useState, useEffect, useCallback } from 'react';
import authFetch from '../../../utils/authFetch';
import {
    Box, Typography, Paper, Tabs, Tab, Button, Grid, TextField,
    IconButton, List, ListItem, ListItemText,
    Select, MenuItem, FormControl, InputLabel, Checkbox, FormControlLabel,
    CircularProgress, Alert
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteIcon from '@mui/icons-material/Delete';
import { LocalizationProvider, TimePicker, DateTimePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import { format } from 'date-fns';
import { useNotification } from '../../../context/NotificationContext';


function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div role="tabpanel" hidden={value !== index} id={`availability-tabpanel-${index}`} aria-labelledby={`availability-tab-${index}`} {...other}>
            {value === index && (<Box sx={{ p: {xs: 1, sm: 2, md: 3} }}>{children}</Box>)}
        </div>
    );
}

const RegularScheduleManager = ({ regularSchedules, onAddSchedule, onRemoveSchedule }) => {
    const daysOfWeek = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
    const [day, setDay] = useState(1); // 1 = Lunes
    const [startTime, setStartTime] = useState(null);
    const [endTime, setEndTime] = useState(null);
    const [slotDuration, setSlotDuration] = useState(30);

    const handleAddClick = () => {
        if (startTime && endTime && startTime < endTime) {
            const newSchedulePayload = {
                dayOfWeek: day,
                startTime: format(startTime, 'HH:mm:ss'),
                endTime: format(endTime, 'HH:mm:ss'),
                slotDurationMinutes: parseInt(slotDuration, 10)
            };
            onAddSchedule(newSchedulePayload);
            setStartTime(null);
            setEndTime(null);
        } else {
            alert("Por favor, seleccione una hora de inicio y fin válidas, donde el inicio sea anterior al fin.");
        }
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Definir Horario Semanal Regular</Typography>
            <Grid container spacing={2} alignItems="flex-end" sx={{mb: 3}}>
                <Grid item xs={12} sm={6} md={3}>
                    <FormControl fullWidth>
                        <InputLabel>Día</InputLabel>
                        <Select value={day} label="Día" onChange={(e) => setDay(e.target.value)}>
                            {daysOfWeek.map((d, index) => (
                                <MenuItem key={index} value={index + 1}>{d}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                    <TimePicker
                        label="Hora Inicio" value={startTime}
                        onChange={setStartTime}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                        ampm={false}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={2}>
                     <TimePicker
                        label="Hora Fin" value={endTime}
                        onChange={setEndTime}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                        ampm={false}
                    />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <TextField
                        label="Duración Turno (min)" type="number"
                        value={slotDuration} onChange={(e) => setSlotDuration(e.target.value)}
                        fullWidth inputProps={{ min: 15, step: 15 }}
                    />
                </Grid>
                <Grid item xs={12} md={2}>
                    <Button variant="contained" onClick={handleAddClick} startIcon={<AddCircleOutlineIcon />} fullWidth>
                        Añadir
                    </Button>
                </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{mt: 2, mb:1}}>Horarios Configurados:</Typography>
            {regularSchedules.length === 0 && <Typography color="text.secondary">No hay horarios regulares definidos.</Typography>}
            <List>
                {regularSchedules.map((schedule) => (
                    <ListItem
                        key={schedule.id}
                        divider
                        secondaryAction={
                            <IconButton edge="end" aria-label="delete" onClick={() => onRemoveSchedule(schedule.id)}>
                                <DeleteIcon />
                            </IconButton>
                        }
                    >
                        <ListItemText
                            primary={`${daysOfWeek[schedule.dayOfWeek - 1]}: ${schedule.startTime.substring(0,5)} - ${schedule.endTime.substring(0,5)}`}
                            secondary={`Duración de turnos: ${schedule.slotDurationMinutes} min`}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

const TimeBlocksManager = ({ timeBlocks, onAddBlock, onRemoveBlock }) => {
    const [startDateTime, setStartDateTime] = useState(null);
    const [endDateTime, setEndDateTime] = useState(null);
    const [reason, setReason] = useState('');
    const [isAllDay, setIsAllDay] = useState(false);

    const handleAddBlockClick = () => {
        if (!startDateTime || (!isAllDay && !endDateTime)) {
            alert("Por favor, complete la fecha/hora de inicio (y fin si no es todo el día).");
            return;
        }
        if (!isAllDay && endDateTime <= startDateTime) {
            alert("La fecha/hora de fin debe ser posterior a la de inicio.");
            return;
        }

        const newBlockPayload = { startDateTime, endDateTime, reason, isAllDay };
        onAddBlock(newBlockPayload);
        setStartDateTime(null); setEndDateTime(null); setReason(''); setIsAllDay(false);
    };

    return (
        <Box>
            <Typography variant="h6" gutterBottom>Añadir Bloqueo de Tiempo</Typography>
             <Grid container spacing={2} alignItems="center" sx={{mb: 3}}>
                <Grid item xs={12} sm={isAllDay ? 12 : 5}>
                     <DateTimePicker
                        label={isAllDay ? "Seleccione el Día a Bloquear" : "Inicio del Bloqueo"}
                        value={startDateTime} onChange={setStartDateTime}
                        renderInput={(params) => <TextField {...params} fullWidth />}
                        ampm={false} format={isAllDay ? "dd/MM/yyyy" : "dd/MM/yyyy HH:mm"}
                        views={isAllDay ? ['year', 'month', 'day'] : ['year', 'month', 'day', 'hours', 'minutes']}
                    />
                </Grid>
                {!isAllDay && (
                    <Grid item xs={12} sm={5}>
                        <DateTimePicker
                            label="Fin del Bloqueo" value={endDateTime}
                            onChange={setEndDateTime}
                            renderInput={(params) => <TextField {...params} fullWidth />}
                            ampm={false} format="dd/MM/yyyy HH:mm"
                        />
                    </Grid>
                )}
                <Grid item xs={12} sm={isAllDay ? 8 : 10}>
                    <TextField label="Motivo (Opcional)" value={reason} onChange={(e) => setReason(e.target.value)} fullWidth/>
                </Grid>
                 <Grid item xs={12} sm={isAllDay ? 4 : 2} sx={{display:'flex', alignItems:'flex-end', pb:0.5}}>
                    <Button variant="contained" onClick={handleAddBlockClick} startIcon={<AddCircleOutlineIcon />} fullWidth>Bloquear</Button>
                </Grid>
                <Grid item xs={12}>
                    <FormControlLabel control={<Checkbox checked={isAllDay} onChange={(e) => { setIsAllDay(e.target.checked); if (e.target.checked) setEndDateTime(null);}}/>} label="Bloquear todo el día"/>
                </Grid>
            </Grid>

            <Typography variant="subtitle1" sx={{mt: 2, mb:1}}>Bloqueos Activos:</Typography>
            {timeBlocks.length === 0 && <Typography color="text.secondary">No hay bloqueos de tiempo definidos.</Typography>}
            <List>
                {timeBlocks.map((block) => (
                    <ListItem key={block.id} divider secondaryAction={<IconButton edge="end" aria-label="delete" onClick={() => onRemoveBlock(block.id)}><DeleteIcon /></IconButton>}>
                        <ListItemText
                            primary={block.isAllDay
                                ? `Día completo: ${new Date(block.startDateTime).toLocaleDateString('es-ES')}`
                                : `Desde: ${new Date(block.startDateTime).toLocaleString('es-ES')} Hasta: ${new Date(block.endDateTime).toLocaleString('es-ES')}`}
                            secondary={`Motivo: ${block.reason || 'N/A'}`}
                        />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

const AvailabilityView = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [regularSchedules, setRegularSchedules] = useState([]);
    const [timeBlocks, setTimeBlocks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const { showNotification } = useNotification();

    const fetchAvailabilityData = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const [schedulesResponse, blocksResponse] = await Promise.all([
                authFetch('/api/availability/regular'),
                authFetch('/api/availability/blocks')
            ]);

            setRegularSchedules(schedulesResponse.sort((a,b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)) || []);
            setTimeBlocks(blocksResponse.sort((a,b) => new Date(a.startDateTime) - new Date(b.startDateTime)) || []);
        } catch (error) {
            console.error("Error cargando datos de disponibilidad:", error);
            setError(error.message || "Error al cargar datos.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAvailabilityData();
    }, [fetchAvailabilityData]);

    const handleTabChange = (event, newValue) => setCurrentTab(newValue);

    const handleAddRegularSchedule = async (newSchedulePayload) => {
        setError('');
        try {
            const savedSchedule = await authFetch('/api/availability/regular', {
                method: 'POST',
                body: JSON.stringify(newSchedulePayload),
            });
            fetchAvailabilityData();
        } catch (error) {
            console.error("Error añadiendo horario regular:", error);
            setError(error.message || "Error al guardar horario.");
        }
    };

    const handleRemoveRegularSchedule = async (scheduleId) => {
        setError('');
        if (window.confirm("¿Está seguro de que desea eliminar este horario regular?")) {
            try {
                await authFetch(`/api/availability/regular/${scheduleId}`, { method: 'DELETE' });
                fetchAvailabilityData();
                showNotification('Horario eliminado.', 'info');
            } catch (error) {showNotification(error.message || 'Error al eliminar el horario.', 'error');}
        }
    };

    const handleAddTimeBlock = async (newBlockPayload) => {
        setError('');
        try {
            await authFetch('/api/availability/blocks', {
                method: 'POST',
                body: JSON.stringify(newBlockPayload),
            });
            fetchAvailabilityData();
        } catch (error) {
            console.error("Error añadiendo bloqueo:", error);
            setError(error.message || "Error al guardar bloqueo.");
        }
    };

    const handleRemoveTimeBlock = async (blockId) => {
        setError('');
        if (window.confirm("¿Está seguro de que desea eliminar este bloqueo de tiempo?")) {
            try {
                await authFetch(`/api/availability/blocks/${blockId}`, { method: 'DELETE' });
                fetchAvailabilityData();
            } catch (error) {
                console.error("Error eliminando bloqueo:", error);
                setError(error.message || "Error al eliminar bloqueo.");
            }
        }
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
            <Paper elevation={3} sx={{ p: {xs: 1, sm: 2, md: 3} }}>
                <Typography variant="h5" gutterBottom sx={{ mb: 2 }}>Gestión de Horarios</Typography>
                {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
                <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                    <Tabs value={currentTab} onChange={handleTabChange} aria-label="Pestañas de disponibilidad">
                        <Tab label="Horarios Regulares" id="availability-tab-0" aria-controls="availability-tabpanel-0" />
                        <Tab label="Bloqueos Específicos" id="availability-tab-1" aria-controls="availability-tabpanel-1" />
                    </Tabs>
                </Box>
                {loading ? <CircularProgress sx={{display:'block', mx:'auto', my: 5}}/> : (
                    <>
                        <TabPanel value={currentTab} index={0}>
                            <RegularScheduleManager
                                regularSchedules={regularSchedules}
                                onAddSchedule={handleAddRegularSchedule}
                                onRemoveSchedule={handleRemoveRegularSchedule}
                            />
                        </TabPanel>
                        <TabPanel value={currentTab} index={1}>
                            <TimeBlocksManager
                                timeBlocks={timeBlocks}
                                onAddBlock={handleAddTimeBlock}
                                onRemoveBlock={handleRemoveTimeBlock}
                            />
                        </TabPanel>
                    </>
                )}
            </Paper>
        </LocalizationProvider>
    );
};

export default AvailabilityView;