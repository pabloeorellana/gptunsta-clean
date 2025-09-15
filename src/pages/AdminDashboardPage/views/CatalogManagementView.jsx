import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Box, Typography, Button, Tooltip, IconButton, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Tabs, Tab, Paper, DialogContentText
} from '@mui/material';
import { MaterialReactTable } from 'material-react-table';
import { MRT_Localization_ES } from 'material-react-table/locales/es';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import authFetch from '../../../utils/authFetch';
import { useNotification } from '../../../context/NotificationContext';

const initialItemState = { name: '', description: '' };

const CatalogManager = ({ catalogName, apiEndpoint }) => {
    const { showNotification } = useNotification();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState(initialItemState);
    const [validationErrors, setValidationErrors] = useState({});

    const [openDeleteConfirmModal, setOpenDeleteConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const fetchItems = useCallback(async () => {
        setLoading(true);
        try {
            const data = await authFetch(apiEndpoint);
            setItems(data || []);
        } catch (err) {
            showNotification(`Error al cargar ${catalogName}: ${err.message}`, 'error');
        } finally {
            setLoading(false);
        }
    }, [apiEndpoint, catalogName, showNotification]);

    useEffect(() => {
        fetchItems();
    }, [fetchItems]);

    const handleOpenCreateModal = () => {
        setIsEditing(false);
        setCurrentItem(initialItemState);
        setValidationErrors({});
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (item) => {
        setIsEditing(true);
        setCurrentItem(item);
        setValidationErrors({});
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleChange = (e) => {
        setCurrentItem(prev => ({ ...prev, [e.target.name]: e.target.value }));
        if (validationErrors[e.target.name]) setValidationErrors(prev => ({ ...prev, [e.target.name]: null }));
    };

    const validate = () => {
        const errors = {};
        if (!currentItem.name?.trim()) errors.name = 'El nombre es requerido.';
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validate()) return;
        const url = isEditing ? `${apiEndpoint}/${currentItem.id}` : apiEndpoint;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            await authFetch(url, { method, body: JSON.stringify(currentItem) });
            showNotification(`${isEditing ? 'Actualizado' : 'Creado'} con éxito.`, 'success');
            handleCloseModal();
            fetchItems();
        } catch (err) {
            showNotification(err.message, 'error');
        }
    };
    
    const handleDeleteRequest = (row) => {
        setItemToDelete(row.original);
        setOpenDeleteConfirmModal(true);
    };

    const handleCloseDeleteConfirmModal = () => {
        setOpenDeleteConfirmModal(false);
        setItemToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await authFetch(`${apiEndpoint}/${itemToDelete.id}`, { method: 'DELETE' });
            showNotification('Eliminado con éxito.', 'success');
            fetchItems();
        } catch (err) {
            showNotification(err.message, 'error');
        } finally {
            handleCloseDeleteConfirmModal();
        }
    };
    
    const columns = useMemo(() => [
        { accessorKey: 'name', header: 'Nombre' },
        { accessorKey: 'description', header: 'Descripción', Cell: ({ cell }) => cell.getValue() || 'N/A' },
    ], []);

    return (
        <Box>
            <MaterialReactTable
                columns={columns}
                data={items}
                localization={MRT_Localization_ES}
                state={{ isLoading: loading }}
                enableRowActions
                renderRowActions={({ row }) => (
                    <Box sx={{ display: 'flex', gap: '1rem' }}>
                        <Tooltip title="Editar"><IconButton onClick={() => handleOpenEditModal(row.original)}><EditIcon /></IconButton></Tooltip>
                        <Tooltip title="Eliminar"><IconButton color="error" onClick={() => handleDeleteRequest(row)}><DeleteIcon /></IconButton></Tooltip>
                    </Box>
                )}
                renderTopToolbarCustomActions={() => (
                    <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenCreateModal}>
                        Añadir Nuevo
                    </Button>
                )}
            />
            <Dialog open={isModalOpen} onClose={handleCloseModal} fullWidth>
                <DialogTitle>{isEditing ? 'Editar' : 'Crear'} {catalogName}</DialogTitle>
                <DialogContent>
                    <TextField autoFocus margin="dense" name="name" label="Nombre *" value={currentItem.name} onChange={handleChange} fullWidth error={!!validationErrors.name} helperText={validationErrors.name} />
                    <TextField margin="dense" name="description" label="Descripción (Opcional)" value={currentItem.description || ''} onChange={handleChange} fullWidth multiline rows={3} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Cancelar</Button>
                    <Button onClick={handleSave} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>

            {/* NUEVO MODAL DE CONFIRMACIÓN */}
            <Dialog open={openDeleteConfirmModal} onClose={handleCloseDeleteConfirmModal}>
                <DialogTitle>Confirmar Eliminación</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        ¿Está seguro de que desea eliminar "{itemToDelete?.name}"? Esta acción no se puede deshacer.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirmModal}>Cancelar</Button>
                    <Button onClick={handleConfirmDelete} color="error">Eliminar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

const CatalogManagementView = () => {
    const [tabIndex, setTabIndex] = useState(0);
    const handleTabChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
            <Typography variant="h5" gutterBottom>Gestión de Catálogos</Typography>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleTabChange} aria-label="pestañas de catálogos">
                    <Tab label="Especialidades" id="catalog-tab-0" aria-controls="catalog-tabpanel-0" />
                    <Tab label="Patologías" id="catalog-tab-1" aria-controls="catalog-tabpanel-1" />
                </Tabs>
            </Box>
            <Box sx={{ pt: 2 }}>
                {tabIndex === 0 && <CatalogManager catalogName="Especialidad" apiEndpoint="/api/catalogs/specialties" />}
                {tabIndex === 1 && <CatalogManager catalogName="Patología" apiEndpoint="/api/catalogs/pathologies" />}
            </Box>
        </Paper>
    );
};

export default CatalogManagementView;