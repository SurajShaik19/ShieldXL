import { Router } from 'express';
import { AnalysisController } from '../controllers/analysisController.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = Router();

router.use(requireAuth);

router.post('/', AnalysisController.submit);
router.post('/upload', uploadMiddleware.single('media'), AnalysisController.uploadMedia);
router.get('/', AnalysisController.list);
router.get('/:id', AnalysisController.getById);
router.post('/:id/retry', AnalysisController.retry);
router.post('/:id/manual-result', AnalysisController.submitManualResult);

export default router;
