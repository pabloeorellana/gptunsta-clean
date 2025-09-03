import express from 'express';
import { 
    getPatients, createPatient, updatePatient, togglePatientStatus 
} from '../controllers/patientController.js';
import { getClinicalRecords, addClinicalRecord } from '../controllers/clinicalRecordController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.route('/')
    .get(getPatients)
    .post(createPatient);

router.route('/:id')
    .put(updatePatient)
    .delete(togglePatientStatus);

router.route('/:patientId/clinical-records')
    .get(getClinicalRecords)
    .post(addClinicalRecord);
    
export default router;