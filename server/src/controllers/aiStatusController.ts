import { Request, Response } from 'express';
import { BrowserSessionManager } from '../services/browserSessionManager.js';
import { emailService } from '../services/notifications/emailService.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { AIWebsite } from '../types/index.js';

export class AiStatusController {
  /**
   * GET /api/ai/status - Fetch current health and session verification info for Meta AI & Grok
   */
  public static async getStatus(_req: Request, res: Response): Promise<void> {
    try {
      const sessionManager = BrowserSessionManager.getInstance();

      const [metaStatus, grokStatus] = await Promise.all([
        sessionManager.checkSessionStatus('META_AI'),
        sessionManager.checkSessionStatus('GROK'),
      ]);

      const emailStatus = emailService.getStatus();

      res.json({
        services: {
          metaAi: metaStatus,
          grok: grokStatus,
        },
        notifications: {
          emailConfigured: emailStatus.isConfigured,
          host: emailStatus.host,
        },
        systemTime: new Date(),
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error checking AI status.' });
    }
  }

  /**
   * POST /api/ai/status/:service/initialize - Administrator initializes/probes browser session
   */
  public static async initializeSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.initializeSession(service);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed initializing browser session.' });
    }
  }

  /**
   * POST /api/ai/status/:service/verify - Administrator triggers live session verification
   */
  public static async verifySession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const status = await sessionManager.checkSessionStatus(service);

      res.json({
        service,
        status,
        message: status.isAuthenticated
          ? `${service} persistent session verified active.`
          : `${service} session requires authentication.`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed verifying browser session.' });
    }
  }

  /**
   * POST /api/ai/status/:service/reset - Administrator securely resets session profile cache
   */
  public static async resetSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.resetSession(service);

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed resetting browser session.' });
    }
  }

  /**
   * POST /api/ai/status/:service/launch-login - Launches headed desktop browser window for manual login (localhost)
   */
  public static async launchLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.launchInteractiveLogin(service);

      res.json({ service, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed launching browser login window.' });
    }
  }

  /**
   * POST /api/ai/status/:service/save-session - Saves interactive session storage state and verifies
   */
  public static async saveSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.saveInteractiveLogin(service);

      res.json({ service, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed saving browser session.' });
    }
  }

  /**
   * POST /api/ai/status/:service/cancel-login - Closes interactive window without saving
   */
  public static async cancelLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.cancelInteractiveLogin(service);

      res.json({ service, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed closing browser window.' });
    }
  }

  /**
   * POST /api/ai/status/:service/import-session - Import cookies / storageState JSON for Cloud MVP Hosting
   */
  public static async importSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const { sessionData, rawData } = req.body;
      const dataToImport = sessionData || rawData;

      if (!dataToImport || typeof dataToImport !== 'string' || dataToImport.trim().length === 0) {
        res.status(400).json({ error: 'Please provide valid sessionData (storageState JSON or Cookie string).' });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.importSessionState(service, dataToImport);

      if (!result.success) {
        res.status(400).json({ error: result.message });
        return;
      }

      res.json({ service, ...result });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed importing session state.' });
    }
  }

  /**
   * GET /api/ai/status/:service/export-session - Export storageState JSON for transfer to Cloud MVP Hosting
   */
  public static async exportSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const rawService = (req.params.service || '').toUpperCase();
      const service: AIWebsite = rawService === 'META' || rawService === 'META_AI' ? 'META_AI' : 'GROK';

      if (rawService !== 'META' && rawService !== 'META_AI' && rawService !== 'GROK') {
        res.status(400).json({ error: "Invalid service. Must be 'META_AI' or 'GROK'." });
        return;
      }

      const sessionManager = BrowserSessionManager.getInstance();
      const result = await sessionManager.exportSessionState(service);

      if (!result.success) {
        res.status(404).json({ error: result.message });
        return;
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed exporting session state.' });
    }
  }
}
