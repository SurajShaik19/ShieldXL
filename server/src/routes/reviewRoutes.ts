import { Router } from 'express';
import { ReviewController } from '../controllers/reviewController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);
router.use(requireRole('REVIEWER', 'ADMIN'));

router.get('/', ReviewController.listPendingReviews);
router.post('/:id/decision', ReviewController.submitDecision);

export default router;
