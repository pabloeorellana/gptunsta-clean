import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Box, Typography, Paper, Grid, Button, CircularProgress, Stack, Divider,
    TextField, Select, MenuItem, FormControl, InputLabel, Card, CardContent
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { subDays, format, startOfMonth, endOfMonth, isValid, isBefore } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import authFetch from '../../../utils/authFetch';

const statusDetails = {
    COMPLETED: { label: 'Completados', color: '#4caf50' },
    SCHEDULED: { label: 'Programados', color: '#2196f3' },
    CONFIRMED: { label: 'Confirmados', color: '#1976d2' },
    CANCELED_PROFESSIONAL: { label: 'Cancelado (Prof.)', color: '#d32f2f' },
    CANCELED_PATIENT: { label: 'Cancelado (Pac.)', color: '#f44336' },
    NO_SHOW: { label: 'No Asistió', color: '#9e9e9e' },
};

const GRAPH_COLORS = ['#4caf50', '#2196f3', '#1976d2', '#d32f2f', '#f44336', '#9e9e9e', '#ffc107'];

const AdminStatisticsView = () => {
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [statsData, setStatsData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [professionals, setProfessionals] = useState([]);
    const [selectedProfessional, setSelectedProfessional] = useState('ALL');
    const reportRef = useRef(null);

    useEffect(() => {
        const fetchProfessionals = async () => {
            try {
                const users = await authFetch('/api/admin/users');
                const professionalUsers = users.filter(user => user.role === 'PROFESSIONAL');
                setProfessionals(professionalUsers);
            } catch (err) {
                setError(err.message || 'Error al cargar la lista de profesionales');
            }
        };
        fetchProfessionals();
    }, []);

    const fetchStatistics = useCallback(async () => {
        if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate) || isBefore(endDate, startDate)) {
            setError("Por favor, seleccione un rango de fechas válido.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');
            let url = `/api/statistics?startDate=${formattedStartDate}&endDate=${formattedEndDate}`;
            if (selectedProfessional !== 'ALL') {
                url += `&professionalId=${selectedProfessional}`;
            }

            const statsResponse = await authFetch(url);
            setStatsData(statsResponse);
        } catch (err) {
            setError(err.message || "Error al cargar las estadísticas.");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate, selectedProfessional]);

    useEffect(() => {
        fetchStatistics();
    }, [fetchStatistics]);

    const handleExportToPdf = () => {
        const input = reportRef.current;
        if (!input) return;
        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const imgHeight = (canvas.height * pdfWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 10;
            pdf.addImage(imgData, 'PNG', 10, position, pdfWidth - 20, imgHeight);
            heightLeft -= (pdf.internal.pageSize.getHeight() - 20);
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, pdfWidth - 20, imgHeight);
                heightLeft -= pdf.internal.pageSize.getHeight();
            }
            const dateString = format(new Date(), 'yyyy-MM-dd');
            pdf.save(`Reporte_NutriSmart_Global_${dateString}.pdf`);
        });
    };
    
    const chartDataForDisplay = useMemo(() => {
        if (!statsData || !statsData.appointmentsByStatus) return [];
        return statsData.appointmentsByStatus.filter(s => s.value > 0);
    }, [statsData]);

    const RADIAN = Math.PI / 180;
    const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        if (percent * 100 < 5) return null;
        const radius = outerRadius + 15;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        return (
            <text x={x} y={y} fill="black" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12px">
                {`${(percent * 100).toFixed(0)}%`}
            </text>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fnsEsLocale}>
            <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                <Stack direction={{xs: 'column', md: 'row'}} justifyContent="space-between" alignItems="center" spacing={2} mb={2}>
                    <Typography variant="h5" gutterBottom component="div" sx={{m:0}}>
                        Estadísticas Globales
                    </Typography>
                    <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportToPdf} disabled={!statsData || loading}>
                        Exportar a PDF
                    </Button>
                </Stack>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Profesional</InputLabel>
                            <Select value={selectedProfessional} label="Profesional" onChange={(e) => setSelectedProfessional(e.target.value)}>
                                <MenuItem value="ALL">Todos los Profesionales</MenuItem>
                                {professionals.map(prof => (
                                    <MenuItem key={prof.id} value={prof.id}>{prof.fullName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Fecha Inicio" value={startDate} onChange={setStartDate} renderInput={(params) => <TextField {...params} fullWidth size="small" />} maxDate={endDate || new Date()} format="dd/MM/yyyy" /></Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Fecha Fin" value={endDate} onChange={setEndDate} renderInput={(params) => <TextField {...params} fullWidth size="small" />} minDate={startDate} maxDate={new Date()} format="dd/MM/yyyy" /></Grid>
                    <Grid item xs={12} sm={6} md={3}><Button variant="contained" onClick={fetchStatistics} disabled={loading} startIcon={<SearchIcon />} fullWidth size="medium">Buscar</Button></Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Box ref={reportRef} sx={{ bgcolor: 'background.paper', p: {xs: 0, sm: 1} }}>
                    {loading && (<Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress size={50} /></Box>)}
                    {error && <Alert severity="error">{error}</Alert>}
                    {!loading && statsData && (
                        <>
                            <Typography variant="h6" align="center" gutterBottom>Reporte de Actividad del {format(startDate, 'dd/MM/yyyy')} al {format(endDate, 'dd/MM/yyyy')}</Typography>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2, height: 420, display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h6" gutterBottom align="center">Distribución por Estado</Typography>
                                        {chartDataForDisplay.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie data={chartDataForDisplay} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={renderCustomizedPieLabel}>
                                                        {chartDataForDisplay.map((entry, index) => (<Cell key={`cell-${entry.key}`} fill={statusDetails[entry.key]?.color || GRAPH_COLORS[index % GRAPH_COLORS.length]} />))}
                                                    </Pie>
                                                    <Tooltip formatter={(value, name) => [`${value} turnos`, name]}/>
                                                    <Legend />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        ) : <Typography color="text.secondary" align="center" sx={{pt:5}}>No hay datos para graficar.</Typography>}
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                     <Paper variant="outlined" sx={{ p: 2, height: 420, display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h6" gutterBottom align="center">Cantidad de Turnos por Estado</Typography>
                                        {chartDataForDisplay.length > 0 ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={chartDataForDisplay} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" />
                                                    <XAxis dataKey="name" tick={{fontSize: 10}}/>
                                                    <YAxis allowDecimals={false} />
                                                    <Tooltip formatter={(value) => [`${value} turnos`, "Cantidad"]}/>
                                                    <Legend />
                                                    <Bar dataKey="value" name="Cantidad de Turnos">
                                                        {chartDataForDisplay.map((entry, index) => (<Cell key={`cell-bar-${entry.key}`} fill={statusDetails[entry.key]?.color || GRAPH_COLORS[index % GRAPH_COLORS.length]} />))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : <Typography color="text.secondary" align="center" sx={{pt:5}}>No hay datos para graficar.</Typography>}
                                    </Paper>
                                </Grid>
                            </Grid>
                        </>
                    )}
                </Box>
            </Paper>
        </LocalizationProvider>
    );
};

export default AdminStatisticsView;