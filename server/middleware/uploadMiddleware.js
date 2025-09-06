import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Importamos el módulo 'file-system' de Node.js

const storage = multer.diskStorage({
    destination(req, file, cb) {
        /*
        // --- CÓDIGO ANTIGUO (COMENTADO PARA ANÁLISIS) ---
        // Este código usaba rutas relativas (__dirname, projectRoot) que podían ser
        // ambiguas dentro de un entorno de contenedor. Podría resolver a
        // /app/server/uploads o /app/uploads dependiendo del contexto.
        // const __filename = fileURLToPath(import.meta.url);
        // const __dirname = path.dirname(__filename);
        // const projectRoot = path.join(__dirname, '..');
        // const uploadPath = path.join(projectRoot, 'uploads', 'avatars');
        // fs.mkdirSync(uploadPath, { recursive: true });
        // cb(null, uploadPath);
        */

        // --- CÓDIGO NUEVO Y MEJORADO ---
        // 1. Definimos una ruta ABSOLUTA y sin ambigüedades dentro del contenedor.
        //    Esta es la ruta que hemos mapeado con el "Volume Mount" en Coolify.
        const uploadPath = '/app/uploads/avatars';

        // 2. Usamos fs.mkdirSync para crear el directorio si no existe.
        //    La opción { recursive: true } es clave: creará 'uploads' y luego 'avatars'.
        fs.mkdirSync(uploadPath, { recursive: true });

        // 3. Pasamos la ruta absoluta al callback de multer.
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
        // Tu lógica de nombres de archivo original. Está perfecta.
        cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: ¡Solo se permiten imágenes! (jpeg, jpg, png, gif)'), false);
    }
}

const upload = multer({
    storage,
    limits: { fileSize: 2 * 1024 * 1024 }, // Límite de 2MB
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

export const uploadAvatar = upload.single('profileImage');