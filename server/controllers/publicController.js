import pool from '../config/db.js';

export const getPublicProfessionals = async (req, res) => {
    try {
        const [professionals] = await pool.query(`
            SELECT 
                u.id, 
                u.fullName, 
                u.profileImageUrl, 
                p.specialty, 
                p.description 
            FROM Users u
            JOIN Professionals p ON u.id = p.userId
            WHERE u.isActive = TRUE AND u.role = 'PROFESSIONAL'
        `);

        console.log("DATOS CRUDOS DE PROFESIONALES DESDE LA API:", professionals);
        res.json(professionals);
    } catch (error) {
        console.error("Error en getPublicProfessionals:", error);
        res.status(500).json({ message: "Error del servidor al obtener la lista de profesionales." });
    }
};