import { Router } from 'express';
import { NotificationController } from '../controllers/notificationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', NotificationController.list);
router.patch('/:id/read', NotificationController.markRead);
router.post('/test', NotificationController.testAlert);

export default router;
