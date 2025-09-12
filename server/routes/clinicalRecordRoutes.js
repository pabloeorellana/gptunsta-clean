import express from 'express';
import { updateClinicalRecord, deleteClinicalRecord, uploadAttachment } from '../controllers/clinicalRecordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import { uploadClinicalAttachment } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.post('/upload', uploadClinicalAttachment, uploadAttachment);

router.route('/:recordId')
    .put(updateClinicalRecord)
    .delete(deleteClinicalRecord);

export default router;