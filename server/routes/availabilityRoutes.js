// server/routes/availabilityRoutes.js
import express from 'express';
import {
    getRegularSchedules,
    addRegularSchedule,
    removeRegularSchedule,
    getTimeBlocks,
    addTimeBlock,
    removeTimeBlock
} from '../controllers/availabilityController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Todas estas rutas requieren que el usuario sea un PROFESIONAL autenticado
router.use(protect);
router.use(authorize('PROFESSIONAL')); // O ('PROFESSIONAL', 'ADMIN') si los admins pueden gestionar esto

router.route('/regular')
    .get(getRegularSchedules)
    .post(addRegularSchedule);
router.route('/regular/:scheduleId').delete(removeRegularSchedule);

router.route('/blocks')
    .get(getTimeBlocks)
    .post(addTimeBlock);
router.route('/blocks/:blockId').delete(removeTimeBlock);

export default router;