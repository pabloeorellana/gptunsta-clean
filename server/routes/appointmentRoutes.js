import express from 'express';
import {
    getAppointments,
    createManualAppointment,
    updateAppointmentStatus,
    reprogramAppointment,
    deleteAppointment,
    updateProfessionalNotes
} from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.route('/').get(getAppointments);
router.route('/manual').post(createManualAppointment);
router.route('/:id').delete(deleteAppointment);
router.route('/:id/status').put(updateAppointmentStatus);
router.route('/:id/reprogram').put(reprogramAppointment);
router.route('/:id/notes').put(updateProfessionalNotes);

export default router;