import express from 'express';
import {
    getMyUserProfile,
    updateMyUserProfile,
    getMyProfessionalProfile,
    changeMyPassword,
} from '../controllers/userController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadAvatar } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.route('/me')
    .get(protect, getMyUserProfile)
    .put(protect, uploadAvatar, updateMyUserProfile);

router.route('/me/change-password')
    .put(protect, changeMyPassword);

router.route('/professionals/me')
    .get(protect, authorize('PROFESSIONAL', 'ADMIN'), getMyProfessionalProfile);

export default router;