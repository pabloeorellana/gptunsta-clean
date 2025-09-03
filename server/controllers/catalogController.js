import pool from '../config/db.js';

export const getSpecialties = async (req, res) => {
    try {
        const [specialties] = await pool.query('SELECT * FROM Specialties ORDER BY name ASC');
        res.json(specialties);
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al obtener especialidades.' });
    }
};

export const createSpecialty = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre es requerido.' });
    }
    try {
        const [result] = await pool.query('INSERT INTO Specialties (name, description) VALUES (?, ?)', [name, description || null]);
        const [newSpecialty] = await pool.query('SELECT * FROM Specialties WHERE id = ?', [result.insertId]);
        res.status(201).json(newSpecialty[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'La especialidad ya existe.' });
        }
        res.status(500).json({ message: 'Error del servidor al crear la especialidad.' });
    }
};

export const updateSpecialty = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre es requerido.' });
    }
    try {
        const [result] = await pool.query('UPDATE Specialties SET name = ?, description = ? WHERE id = ?', [name, description || null, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Especialidad no encontrada.' });
        }
        const [updatedSpecialty] = await pool.query('SELECT * FROM Specialties WHERE id = ?', [id]);
        res.json(updatedSpecialty[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe otra especialidad con ese nombre.' });
        }
        res.status(500).json({ message: 'Error del servidor al actualizar la especialidad.' });
    }
};

export const deleteSpecialty = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Specialties WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Especialidad no encontrada.' });
        }
        res.json({ message: 'Especialidad eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al eliminar la especialidad.' });
    }
};

export const getPathologies = async (req, res) => {
    try {
        const [pathologies] = await pool.query('SELECT * FROM Pathologies ORDER BY name ASC');
        res.json(pathologies);
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al obtener patologías.' });
    }
};

export const createPathology = async (req, res) => {
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre es requerido.' });
    }
    try {
        const [result] = await pool.query('INSERT INTO Pathologies (name, description) VALUES (?, ?)', [name, description || null]);
        const [newPathology] = await pool.query('SELECT * FROM Pathologies WHERE id = ?', [result.insertId]);
        res.status(201).json(newPathology[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'La patología ya existe.' });
        }
        res.status(500).json({ message: 'Error del servidor al crear la patología.' });
    }
};

export const updatePathology = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!name) {
        return res.status(400).json({ message: 'El nombre es requerido.' });
    }
    try {
        const [result] = await pool.query('UPDATE Pathologies SET name = ?, description = ? WHERE id = ?', [name, description || null, id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Patología no encontrada.' });
        }
        const [updatedPathology] = await pool.query('SELECT * FROM Pathologies WHERE id = ?', [id]);
        res.json(updatedPathology[0]);
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe otra patología con ese nombre.' });
        }
        res.status(500).json({ message: 'Error del servidor al actualizar la patología.' });
    }
};

export const deletePathology = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM Pathologies WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Patología no encontrada.' });
        }
        res.json({ message: 'Patología eliminada.' });
    } catch (error) {
        res.status(500).json({ message: 'Error del servidor al eliminar la patología.' });
    }
};