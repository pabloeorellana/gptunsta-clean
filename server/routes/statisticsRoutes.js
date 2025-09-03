import express from 'express';
import { getStatistics, getAppointmentsListForReport } from '../controllers/statisticsController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect);
router.use(authorize('PROFESSIONAL', 'ADMIN'));

router.route('/')
    .get(getStatistics);

router.route('/appointments-list')
    .get(getAppointmentsListForReport);

export default router;