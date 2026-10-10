import { Router } from 'express';
import { AiStatusController } from '../controllers/aiStatusController.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.get('/', AiStatusController.getStatus);

// Admin-only session management routes
router.post('/:service/initialize', requireAuth, requireRole('ADMIN'), AiStatusController.initializeSession);
router.post('/:service/verify', requireAuth, requireRole('ADMIN'), AiStatusController.verifySession);
router.post('/:service/reset', requireAuth, requireRole('ADMIN'), AiStatusController.resetSession);
router.post('/:service/launch-login', requireAuth, requireRole('ADMIN'), AiStatusController.launchLogin);
router.post('/:service/save-session', requireAuth, requireRole('ADMIN'), AiStatusController.saveSession);
router.post('/:service/cancel-login', requireAuth, requireRole('ADMIN'), AiStatusController.cancelLogin);
router.post('/:service/import-session', requireAuth, requireRole('ADMIN'), AiStatusController.importSession);
router.get('/:service/export-session', requireAuth, requireRole('ADMIN'), AiStatusController.exportSession);

export default router;
