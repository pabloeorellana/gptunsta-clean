import express from 'express';
import { lookupPatientByDni } from '../controllers/patientController.js';
import { getAvailability } from '../controllers/availabilityController.js';
import { createPublicAppointment } from '../controllers/appointmentController.js';
import { getPublicProfessionals } from '../controllers/publicController.js';
const router = express.Router();

router.get('/professionals', getPublicProfessionals);
router.get('/availability', getAvailability);
router.get('/patients/lookup', lookupPatientByDni);
router.post('/appointments', createPublicAppointment);


export default router;