import { Router, Request, Response } from 'express';
import { getDbStatus } from '../config/db.js';
import { emailService } from '../services/notifications/emailService.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const dbStatus = getDbStatus();
  const emailStatus = emailService.getStatus();

  res.json({
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: {
      connected: dbStatus.connected,
      state: dbStatus.state,
      error: dbStatus.error,
    },
    notifications: {
      emailConfigured: emailStatus.isConfigured,
    },
    services: {
      metaAiSupported: true,
      grokSupported: true,
    },
  });
});

export default router;
