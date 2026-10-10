import { Router } from 'express';
import { PlatformController } from '../controllers/platformController.js';

const router = Router();

router.post('/detect', PlatformController.detect);

export default router;
