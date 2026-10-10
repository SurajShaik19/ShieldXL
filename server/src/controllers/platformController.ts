import { Request, Response } from 'express';
import { z } from 'zod';
import { PlatformDetectionService } from '../services/platformDetectionService.js';
import { BrowserSessionManager } from '../services/browserSessionManager.js';

const detectSchema = z.object({
  url: z.string().min(1, 'URL is required'),
});

export class PlatformController {
  public static async detect(req: Request, res: Response): Promise<void> {
    const parsed = detectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { url } = parsed.data;
    const result = PlatformDetectionService.detect(url);

    // Provide hint about session readiness without executing analysis
    let sessionStatus = 'UNKNOWN';
    if (result.selectedAiWebsite) {
      try {
        const session = await BrowserSessionManager.getInstance().checkSessionStatus(result.selectedAiWebsite);
        sessionStatus = session.isAuthenticated ? 'AUTHENTICATED' : 'REQUIRES_SETUP';
      } catch {
        sessionStatus = 'OFFLINE';
      }
    }

    res.json({
      ...result,
      sessionStatus,
    });
  }
}
