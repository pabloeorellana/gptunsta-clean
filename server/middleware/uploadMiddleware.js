import multer from 'multer';
import path from 'path';
import fs from 'fs'; // Importamos fs para crear el directorio

const storage = multer.diskStorage({
    destination(req, file, cb) {
        // --- CÓDIGO CORREGIDO ---
        // Definimos la ruta absoluta y sin ambigüedades dentro del contenedor.
        // Esta es la ruta que mapearemos con el Persistent Storage.
        const uploadPath = '/app/uploads/avatars';

        // Creamos el directorio si no existe.
        fs.mkdirSync(uploadPath, { recursive: true });

        // Pasamos la ruta absoluta al callback de multer.
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
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
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        checkFileType(file, cb);
    }
});

export const uploadAvatar = upload.single('profileImage');