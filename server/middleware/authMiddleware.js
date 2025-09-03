import jwt from 'jsonwebtoken';

export const protect = async (req, res, next) => {
    const JWT_SECRET = process.env.JWT_SECRET;
    if (!JWT_SECRET) {
        console.error("Error crítico: JWT_SECRET no está disponible en el middleware 'protect'.");
        return res.status(500).json({ message: "Error de configuración del servidor." });
    }
    
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Error de autenticación de token:', error.message);
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({ message: 'Token expirado, por favor inicie sesión de nuevo.' });
            }
            return res.status(401).json({ message: 'No autorizado, token inválido.' });
        }
    }

    if (!token) {
        return res.status(401).json({ message: 'No autorizado, no se proporcionó token.' });
    }
};

export const authorize = (...roles) => { 
    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ message: 'No autorizado (usuario o rol no definido en token).' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: `Rol '${req.user.role}' no autorizado para acceder a este recurso.` });
        }
        next();
    };
};