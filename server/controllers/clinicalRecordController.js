import pool from '../config/db.js';

// Esta función se activa después de que 'uploadClinicalAttachment' guardó el archivo.
// Su único trabajo es devolver la ruta del archivo al frontend.
export const uploadAttachment = (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No se subió ningún archivo.' });
    }
    // Devolvemos la ruta donde se guardó el archivo. El backend lo servirá desde aquí.
    // La ruta será algo como '/data/clinical_attachments/nombre_del_archivo.pdf'
    res.status(201).json({ filePath: req.file.path });
};

export const getClinicalRecords = async (req, res) => {
    const { patientId } = req.params;
    try {
        const [records] = await pool.query(
            'SELECT * FROM ClinicalRecords WHERE patientId = ? ORDER BY entryDate DESC',
            [patientId]
        );
        res.json(records);
    } catch (error) {
        console.error('Error en getClinicalRecords:', error);
        res.status(500).json({ message: 'Error del servidor al obtener historias clínicas.' });
    }
};

export const addClinicalRecord = async (req, res) => {
    const { patientId } = req.params;
    const professionalUserId = req.user.userId;
    const { title, content, pathology, attachmentPath, attachmentName } = req.body;
    if (!content) {
        return res.status(400).json({ message: 'El campo de detalles no puede estar vacío.' });
    }
    try {
        const [result] = await pool.query(
            'INSERT INTO ClinicalRecords (patientId, professionalUserId, title, content, pathology, attachmentPath, attachmentName) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [patientId, professionalUserId, title || null, content, pathology || null, attachmentPath || null, attachmentName || null]
        );
        const [newRecord] = await pool.query('SELECT * FROM ClinicalRecords WHERE id = ?', [result.insertId]);
        res.status(201).json(newRecord[0]);
    } catch (error) {
        console.error('Error en addClinicalRecord:', error);
        res.status(500).json({ message: 'Error del servidor al crear la entrada.' });
    }
};

export const updateClinicalRecord = async (req, res) => {
    const { recordId } = req.params;
    const { title, content, pathology, attachmentPath, attachmentName } = req.body;
    if (!content) {
        return res.status(400).json({ message: 'El campo de detalles no puede estar vacío.' });
    }
    try {
        const [result] = await pool.query(
            'UPDATE ClinicalRecords SET title = ?, content = ?, pathology = ?, attachmentPath = ?, attachmentName = ?, updatedAt = NOW() WHERE id = ?',
            [title || null, content, pathology || null, attachmentPath || null, attachmentName || null, recordId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Entrada de historia clínica no encontrada.' });
        }
        const [updatedRecord] = await pool.query('SELECT * FROM ClinicalRecords WHERE id = ?', [recordId]);
        res.json(updatedRecord[0]);
    } catch (error) {
        console.error('Error en updateClinicalRecord:', error);
        res.status(500).json({ message: 'Error del servidor al actualizar la entrada.' });
    }
};

export const deleteClinicalRecord = async (req, res) => {
    const { recordId } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM ClinicalRecords WHERE id = ?', [recordId]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Entrada de historia clínica no encontrada.' });
        }
        res.json({ message: 'Entrada eliminada correctamente.' });
    } catch (error) {
        console.error('Error en deleteClinicalRecord:', error);
        res.status(500).json({ message: 'Error del servidor al eliminar la entrada.' });
    }
};