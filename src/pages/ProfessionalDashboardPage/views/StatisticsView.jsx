import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
    Box, Typography, Paper, Grid, Button, CircularProgress, Stack, Divider,
    TextField, Select, MenuItem, FormControl, InputLabel, Card, CardContent,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es as fnsEsLocale } from 'date-fns/locale';
import { subDays, format, startOfMonth, endOfMonth, isValid, isBefore, parseISO } from 'date-fns';
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

const mockStatisticsData = (startDate, endDate) => {
    const diffDays = Math.max(0, (new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1;
    const baseAppointments = 5 + Math.floor(diffDays * (Math.random() * 2 + 0.5));
    let remainingAppointments = baseAppointments;
    const generateValue = (percentageOfRemaining, capAtRemaining = true) => {
        let value = Math.floor(remainingAppointments * (Math.random() * (percentageOfRemaining * 0.8) + (percentageOfRemaining * 0.2)));
        if (capAtRemaining) { value = Math.min(value, remainingAppointments); }
        remainingAppointments -= value;
        return value;
    };
    const completed = generateValue(0.5);
    const scheduled = generateValue(0.4);
    const confirmed = generateValue(0.3);
    const canceled_professional = generateValue(0.2);
    const canceled_patient = generateValue(0.3);
    const noShow = Math.max(0, remainingAppointments);
    const allStatuses = [
        { name: statusDetails.COMPLETED.label, value: completed, key: 'COMPLETED' },
        { name: statusDetails.SCHEDULED.label, value: scheduled, key: 'SCHEDULED' },
        { name: statusDetails.CONFIRMED.label, value: confirmed, key: 'CONFIRMED' },
        { name: statusDetails.CANCELED_PROFESSIONAL.label, value: canceled_professional, key: 'CANCELED_PROFESSIONAL' },
        { name: statusDetails.CANCELED_PATIENT.label, value: canceled_patient, key: 'CANCELED_PATIENT' },
        { name: statusDetails.NO_SHOW.label, value: noShow, key: 'NO_SHOW' },
    ];
    return {
        period: { start: format(startDate, "yyyy-MM-dd"), end: format(endDate, "yyyy-MM-dd"), },
        totalAppointments: allStatuses.reduce((sum, s) => sum + s.value, 0),
        appointmentsByStatus: allStatuses,
        uniquePatients: Math.max(1, Math.floor(allStatuses.reduce((sum, s) => sum + s.value, 0) * (Math.random() * 0.2 + 0.5))),
    };
};

const StatisticsView = () => {
    const [startDate, setStartDate] = useState(startOfMonth(new Date()));
    const [endDate, setEndDate] = useState(endOfMonth(new Date()));
    const [statsData, setStatsData] = useState(null);
    const [appointmentList, setAppointmentList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dateRangeKey, setDateRangeKey] = useState('thisMonth');
    const [error, setError] = useState('');
    const reportRef = useRef(null);

    const fetchStatistics = useCallback(async () => {
        if (!startDate || !endDate || !isValid(startDate) || !isValid(endDate) || isBefore(endDate, startDate)) {
            setStatsData(null);
            setAppointmentList([]);
            setError("Por favor, seleccione un rango de fechas válido.");
            return;
        }
        setLoading(true);
        setError('');
        try {
            const formattedStartDate = format(startDate, 'yyyy-MM-dd');
            const formattedEndDate = format(endDate, 'yyyy-MM-dd');

            const [statsResponse, listResponse] = await Promise.all([
                authFetch(`/api/statistics?startDate=${formattedStartDate}&endDate=${formattedEndDate}`),
                authFetch(`/api/statistics/appointments-list?startDate=${formattedStartDate}&endDate=${formattedEndDate}`)
            ]);

            setStatsData(statsResponse);
            setAppointmentList(listResponse || []);
        } catch (err) {
            setError(err.message || "Error al cargar las estadísticas.");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        if (dateRangeKey !== 'custom') {
            fetchStatistics();
        }
    }, [dateRangeKey, fetchStatistics]);

    const presetDateRanges = {
        'today': { label: "Hoy", values: () => ({ start: new Date(), end: new Date() }) },
        'last7days': { label: "Últimos 7 días", values: () => ({ start: subDays(new Date(), 6), end: new Date() }) },
        'thisMonth': { label: "Este Mes", values: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }) },
        'lastMonth': { label: "Mes Pasado", values: () => ({ start: startOfMonth(subDays(startOfMonth(new Date()), 1)), end: endOfMonth(subDays(startOfMonth(new Date()), 1)) }) },
    };

    const handlePresetRangeChange = (event) => {
        const key = event.target.value;
        setDateRangeKey(key);
        if (presetDateRanges[key]) {
            const { start, end } = presetDateRanges[key].values();
            setStartDate(start);
            setEndDate(end);
        }
    };

    const handleApplyCustomDateFilter = () => {
        if (dateRangeKey === 'custom') {
            fetchStatistics();
        }
    };

    const summaryCardData = useMemo(() => {
        if (!statsData) return [];
        const cards = [
            { title: "Total de Turnos", value: statsData.totalAppointments, color: "primary.main" },
            { title: "Pacientes Únicos", value: statsData.uniquePatients, color: "secondary.main" },
        ];
        Object.keys(statusDetails).forEach(key => {
            const statusObjFromData = statsData.appointmentsByStatus.find(s => s.key === key);
            cards.push({
                title: statusDetails[key].label,
                value: statusObjFromData ? statusObjFromData.value : 0,
                color: statusDetails[key]?.color
            });
        });
        return cards;
    }, [statsData]);

    const chartDataForDisplay = useMemo(() => {
        if (!statsData || !statsData.appointmentsByStatus) return [];
        return statsData.appointmentsByStatus.filter(s => s.value > 0);
    }, [statsData]);

    const handleExportToPdf = () => {
        const input = reportRef.current;
        if (!input) return;
        html2canvas(input, { scale: 2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const canvasWidth = canvas.width;
            const canvasHeight = canvas.height;
            const ratio = canvasWidth / canvasHeight;
            const imgWidth = pdfWidth - 20;
            const imgHeight = imgWidth / ratio;
            let heightLeft = imgHeight;
            let position = 10;
            pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
            heightLeft -= (pdfHeight - 20);
            while (heightLeft > 0) {
                position = -pdfHeight + 20;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 10, position, imgWidth, imgHeight);
                heightLeft -= (pdfHeight - 20);
            }
            const dateString = format(new Date(), 'yyyy-MM-dd');
            pdf.save(`Reporte_NutriSmart_${dateString}.pdf`);
        });
    };

    const RADIAN = Math.PI / 180;
    const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
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
                        Estadísticas y Reportes
                    </Typography>
                    <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={handleExportToPdf} disabled={!statsData || loading}>
                        Exportar a PDF
                    </Button>
                </Stack>
                <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
                    <Grid item xs={12} sm={6} md={3}><FormControl fullWidth size="small"><InputLabel>Rango Predefinido</InputLabel><Select value={dateRangeKey} label="Rango Predefinido" onChange={handlePresetRangeChange}>{Object.entries(presetDateRanges).map(([key, { label }]) => (<MenuItem key={key} value={key}>{label}</MenuItem>))}<MenuItem value="custom">Personalizado</MenuItem></Select></FormControl></Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Fecha Inicio" value={startDate} onChange={(newValue) => {setStartDate(newValue); setDateRangeKey('custom');}} renderInput={(params) => <TextField {...params} fullWidth size="small" />} maxDate={endDate || new Date()} format="dd/MM/yyyy" disabled={dateRangeKey !== 'custom'}/></Grid>
                    <Grid item xs={12} sm={6} md={3}><DatePicker label="Fecha Fin" value={endDate} onChange={(newValue) => {setEndDate(newValue); setDateRangeKey('custom');}} renderInput={(params) => <TextField {...params} fullWidth size="small" />} minDate={startDate} maxDate={new Date()} format="dd/MM/yyyy" disabled={dateRangeKey !== 'custom'}/></Grid>
                    <Grid item xs={12} sm={6} md={3}><Button variant="contained" onClick={handleApplyCustomDateFilter} disabled={dateRangeKey !== 'custom' || loading || !startDate || !endDate || isBefore(endDate, startDate)} startIcon={<SearchIcon />} fullWidth size="medium">Buscar</Button></Grid>
                </Grid>
                <Divider sx={{ my: 3 }} />
                <Box ref={reportRef} sx={{ bgcolor: 'background.paper', p: {xs: 0, sm: 1} }}>
                    {loading && (<Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress size={50} /></Box>)}
                    {!loading && !statsData && (<Typography color="text.secondary" sx={{ textAlign: 'center', my: 5 }}>Seleccione un rango de fechas para ver las estadísticas.</Typography>)}
                    {statsData && !loading && (
                        <>
                            <Typography variant="h6" align="center" gutterBottom>Reporte de Actividad del {format(startDate, 'dd/MM/yyyy')} al {format(endDate, 'dd/MM/yyyy')}</Typography>
                            <Grid container spacing={1.5} sx={{ mb: 3 }}>
                                {summaryCardData.map((item) => (
                                    <Grid item xs={6} sm={4} md={3} lg={1.5} key={item.title}><Card variant="outlined" sx={{ height: '100%'}}><CardContent sx={{ textAlign: 'center', p:1, '&:last-child': { pb: 1 } }}><Typography variant="h6" component="div" sx={{ color: item.color || 'text.primary', fontWeight: 'bold' }}>{item.value}</Typography><Typography color="text.secondary" variant="caption" sx={{fontSize: '0.7rem', lineHeight: 1.2}}>{item.title}</Typography></CardContent></Card></Grid>
                                ))}
                            </Grid>
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Paper variant="outlined" sx={{ p: 2, height: 420, display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h6" gutterBottom align="center">Distribución por Estado</Typography>
                                        {chartDataForDisplay && chartDataForDisplay.length > 0 ? (
                                            <Box sx={{ flexGrow: 1, width: '100%', height: 'calc(100% - 40px)' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <PieChart margin={{ top: 20, right: 20, bottom: 40, left: 20 }}>
                                                        <Pie data={chartDataForDisplay} cx="50%" cy="50%" labelLine={false} outerRadius={100} innerRadius={60} fill="#8884d8" dataKey="value" label={renderCustomizedPieLabel}>
                                                            {chartDataForDisplay.map((entry, index) => (<Cell key={`cell-${entry.key}`} fill={statusDetails[entry.key]?.color || GRAPH_COLORS[index % GRAPH_COLORS.length]} />))}
                                                        </Pie>
                                                        <Tooltip formatter={(value, name) => [`${value} turnos`, name]}/>
                                                        <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: "20px", fontSize: "12px"}} iconSize={10} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        ) : <Typography color="text.secondary" align="center" sx={{pt:5}}>No hay datos para graficar.</Typography>}
                                    </Paper>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                     <Paper variant="outlined" sx={{ p: 2, height: 420, display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant="h6" gutterBottom align="center">Cantidad de Turnos por Estado</Typography>
                                        {chartDataForDisplay && chartDataForDisplay.length > 0 ? (
                                            <Box sx={{ flexGrow: 1, width: '100%', height: 'calc(100% - 40px)' }}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart data={chartDataForDisplay} margin={{ top: 5, right: 30, left: 0, bottom: 70 }}>
                                                        <CartesianGrid strokeDasharray="3 3" />
                                                        <XAxis dataKey="name" angle={-35} textAnchor="end" height={80} interval={0} tick={{fontSize: 10}}/>
                                                        <YAxis allowDecimals={false} />
                                                        <Tooltip formatter={(value) => [`${value} turnos`, "Cantidad"]}/>
                                                        <Legend verticalAlign="bottom" wrapperStyle={{paddingTop: "20px", fontSize: "12px"}} iconSize={10}/>
                                                        <Bar dataKey="value" name="Cantidad de Turnos">
                                                            {chartDataForDisplay.map((entry, index) => (<Cell key={`cell-bar-${entry.key}`} fill={statusDetails[entry.key]?.color || GRAPH_COLORS[index % GRAPH_COLORS.length]} />))}
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        ) : <Typography color="text.secondary" align="center" sx={{pt:5}}>No hay datos para graficar.</Typography>}
                                    </Paper>
                                </Grid>
                            </Grid>
                            <Grid item xs={12} sx={{mt: 3}}>
                                <Typography variant="h6" gutterBottom>Historial de Turnos del Período</Typography>
                                <TableContainer component={Paper} variant="outlined">
                                    <Table size="small" aria-label="historial de turnos">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Fecha y Hora</TableCell>
                                                <TableCell>Paciente</TableCell>
                                                <TableCell>Estado</TableCell>
                                                <TableCell>Patología Asociada</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {appointmentList.length === 0 ? (
                                                <TableRow><TableCell colSpan={4} align="center">No hay turnos en este período.</TableCell></TableRow>
                                            ) : (
                                                appointmentList.map((appt, index) => (
                                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell>{format(parseISO(appt.dateTime), "dd/MM/yy HH:mm")}</TableCell>
                                                        <TableCell>{appt.patientName}</TableCell>
                                                        <TableCell>
                                                            <Chip
                                                                label={statusDetails[appt.status]?.label || appt.status}
                                                                size="small"
                                                                sx={{ backgroundColor: statusDetails[appt.status]?.color, color: '#fff' }}
                                                            />
                                                        </TableCell>
                                                        <TableCell>{appt.pathology || 'N/A'}</TableCell>
                                                    </TableRow>
                                                ))
                                            )}
                                        </TableBody>
                                    </Table>
                                </TableContainer>
                            </Grid>
                        </>
                    )}
                </Box>
            </Paper>
        </LocalizationProvider>
    );
};

export default StatisticsView;