import multer from 'multer';
import path from 'path';
import fs from 'fs'; // <--- (AÑADIDO) Importamos el módulo 'file-system' de Node.js
import { fileURLToPath } from 'url'; // <--- (AÑADIDO) Necesario para obtener __dirname en ES Modules

// --- (AÑADIDO) Obtenemos la ruta del directorio actual de forma segura ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Creamos una referencia a la carpeta raíz de nuestro proyecto (un nivel arriba de 'middleware')
const projectRoot = path.join(__dirname, '..');


const storage = multer.diskStorage({
    destination(req, file, cb) {
        /*
        // --- CÓDIGO ANTIGUO (COMENTADO PARA ANÁLISIS) ---
        // Esta línea era demasiado simple. Asumía que la carpeta 'uploads/avatars/'
        // ya existía. Si no existía, el programa fallaba con un error ENOENT.
        cb(null, 'uploads/avatars/');
        */

        // --- CÓDIGO NUEVO Y MEJORADO ---
        // 1. Definimos la ruta completa y absoluta a la carpeta de destino.
        const uploadPath = path.join(projectRoot, 'uploads', 'avatars');

        // 2. Usamos fs.mkdirSync para crear el directorio si no existe.
        //    La opción { recursive: true } es clave: creará 'uploads' y luego 'avatars' si es necesario.
        fs.mkdirSync(uploadPath, { recursive: true });

        // 3. Pasamos la ruta completa al callback de multer.
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
        // Tu lógica de nombres de archivo original. Está perfecta, no necesita cambios.
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