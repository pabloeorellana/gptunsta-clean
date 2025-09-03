import express from 'express';
import { updateClinicalRecord, deleteClinicalRecord } from '../controllers/clinicalRecordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.route('/:recordId')
    .put(updateClinicalRecord)
    .delete(deleteClinicalRecord);

export default router;