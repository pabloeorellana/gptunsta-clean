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

router.use(protect);
router.use(authorize('PROFESSIONAL'));

router.route('/regular')
    .get(getRegularSchedules)
    .post(addRegularSchedule);
router.route('/regular/:scheduleId').delete(removeRegularSchedule);

router.route('/blocks')
    .get(getTimeBlocks)
    .post(addTimeBlock);
router.route('/blocks/:blockId').delete(removeTimeBlock);

export default router;