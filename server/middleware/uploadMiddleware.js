import multer from 'multer';
import path from 'path';
import fs from 'fs';

const avatarStorage = multer.diskStorage({
    destination(req, file, cb) {
        const uploadPath = 'uploads/avatars/';
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
        cb(null, `${req.user.userId}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

function checkImageType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: ¡Solo se permiten imágenes! (jpeg, jpg, png, gif)'), false);
    }
}

export const uploadAvatar = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        checkImageType(file, cb);
    }
}).single('profileImage');

const clinicalAttachmentStorage = multer.diskStorage({
    destination(req, file, cb) {
        const storageBasePath = process.env.STORAGE_PATH || '/data';
        const uploadPath = path.join(storageBasePath, 'clinical_attachments');
        
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename(req, file, cb) {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        cb(null, `${req.user.userId}-${uniqueSuffix}${path.extname(file.originalname)}`);
    }
});

function checkAttachmentType(file, cb) {
    const filetypes = /jpeg|jpg|png|gif|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb(new Error('Error: Solo se permiten archivos de imagen (jpg, png, gif) o PDF.'), false);
    }
}

export const uploadClinicalAttachment = multer({
    storage: clinicalAttachmentStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: function(req, file, cb) {
        checkAttachmentType(file, cb);
    }
}).single('attachment');