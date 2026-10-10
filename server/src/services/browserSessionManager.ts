import { chromium, BrowserContext } from 'playwright';
import path from 'path';
import fs from 'fs';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { AIWebsite, AiSessionStatus } from '../types/index.js';

interface ServiceLock {
  isLocked: boolean;
  queue: (() => void)[];
}

interface VerificationRecord {
  timestamp: Date;
  isAuthenticated: boolean;
  statusMessage: string;
}

interface AnalysisAttemptRecord {
  timestamp: Date;
  success: boolean;
  resultSummary: string;
}

export class BrowserSessionManager {
  private static instance: BrowserSessionManager;
  private activeContexts: Map<AIWebsite, BrowserContext> = new Map();
  private activeInteractiveSessions: Map<
    AIWebsite,
    { context: BrowserContext; page: any; startedAt: Date }
  > = new Map();
  private serviceLocks: Map<AIWebsite, ServiceLock> = new Map([
    ['META_AI', { isLocked: false, queue: [] }],
    ['GROK', { isLocked: false, queue: [] }],
  ]);

  private lastVerifications: Map<AIWebsite, VerificationRecord> = new Map();
  private lastAnalysisAttempts: Map<AIWebsite, AnalysisAttemptRecord> = new Map();
  private lastErrors: Map<AIWebsite, string | null> = new Map([
    ['META_AI', null],
    ['GROK', null],
  ]);

  private constructor() {
    this.ensureProfileDirectories();
  }

  public static getInstance(): BrowserSessionManager {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager();
    }
    return BrowserSessionManager.instance;
  }

  public getProfileDir(service: AIWebsite): string {
    return service === 'META_AI' ? config.browser.metaProfilePath : config.browser.grokProfilePath;
  }

  public isInteractiveActive(service: AIWebsite): boolean {
    return this.activeInteractiveSessions.has(service);
  }

  public hasStorageStateFile(service: AIWebsite): boolean {
    const storagePath = path.join(this.getProfileDir(service), 'storageState.json');
    return fs.existsSync(storagePath);
  }

  private ensureProfileDirectories(): void {
    const metaDir = this.getProfileDir('META_AI');
    const grokDir = this.getProfileDir('GROK');

    if (!fs.existsSync(metaDir)) {
      fs.mkdirSync(metaDir, { recursive: true });
    }
    if (!fs.existsSync(grokDir)) {
      fs.mkdirSync(grokDir, { recursive: true });
    }

    // Hydrate storage states from environment variables if provided (crucial for cloud MVP hosting)
    this.hydrateFromEnv('META_AI', metaDir);
    this.hydrateFromEnv('GROK', grokDir);
  }

  private hydrateFromEnv(service: AIWebsite, profileDir: string): void {
    const envVal =
      service === 'META_AI' ? process.env.META_AI_STORAGE_STATE : process.env.GROK_STORAGE_STATE;
    const storagePath = path.join(profileDir, 'storageState.json');

    if (envVal && !fs.existsSync(storagePath)) {
      try {
        let jsonStr = envVal.trim();
        if (!jsonStr.startsWith('{') && !jsonStr.startsWith('[')) {
          jsonStr = Buffer.from(jsonStr, 'base64').toString('utf-8');
        }
        const parsed = JSON.parse(jsonStr);
        const cookies = Array.isArray(parsed) ? parsed : parsed.cookies || [];
        const origins = parsed.origins || [];
        fs.writeFileSync(storagePath, JSON.stringify({ cookies, origins }, null, 2));
        logger.info({ service, cookieCount: cookies.length }, 'Hydrated storageState.json from environment variable');
      } catch (err: any) {
        logger.warn({ service, err: err.message }, 'Failed hydrating storage state from environment variable');
      }
    }
  }

  /**
   * Acquire concurrency mutex for an AI service profile to prevent concurrent corruption
   */
  public async acquireLock(service: AIWebsite): Promise<() => void> {
    const lock = this.serviceLocks.get(service)!;
    if (lock.isLocked) {
      await new Promise<void>((resolve) => lock.queue.push(resolve));
    }
    lock.isLocked = true;

    return () => {
      lock.isLocked = false;
      const next = lock.queue.shift();
      if (next) {
        next();
      }
    };
  }

  /**
   * Records outcome of an automated analysis job attempt for diagnostics
   */
  public recordAnalysisAttempt(service: AIWebsite, success: boolean, resultSummary: string): void {
    this.lastAnalysisAttempts.set(service, {
      timestamp: new Date(),
      success,
      resultSummary,
    });
    if (!success) {
      this.lastErrors.set(service, resultSummary);
    }
  }

  /**
   * Records last error message for an AI service
   */
  public recordLastError(service: AIWebsite, error: string | null): void {
    this.lastErrors.set(service, error);
  }

  /**
   * Get or launch persistent browser context for a specific service
   */
  public async getPersistentContext(service: AIWebsite, headlessOverride?: boolean): Promise<BrowserContext> {
    const existing = this.activeContexts.get(service);
    if (existing) {
      return existing;
    }

    const profileDir = this.getProfileDir(service);
    const headless = headlessOverride ?? config.browser.headless;

    logger.info({ service, profileDir, headless }, 'Launching persistent browser context for AI service...');

    const context = await chromium.launchPersistentContext(profileDir, {
      headless,
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
    });

    this.activeContexts.set(service, context);

    // Inject cookies from storageState.json if present (crucial for cloud deployments and session reuse)
    const storagePath = path.join(profileDir, 'storageState.json');
    if (fs.existsSync(storagePath)) {
      try {
        const raw = fs.readFileSync(storagePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cookies) && parsed.cookies.length > 0) {
          await context.addCookies(parsed.cookies);
          logger.debug({ service, cookieCount: parsed.cookies.length }, 'Injected storageState cookies into context');
        }
      } catch (err: any) {
        logger.warn({ service, err: err.message }, 'Failed reading/injecting storageState.json cookies');
      }
    }

    context.on('close', () => {
      logger.info({ service }, 'Persistent browser context closed.');
      this.activeContexts.delete(service);
    });

    return context;
  }

  /**
   * Probes current session readiness and authentication status for an AI service
   */
  public async checkSessionStatus(service: AIWebsite): Promise<AiSessionStatus> {
    const releaseLock = await this.acquireLock(service);
    try {
      const context = await this.getPersistentContext(service);
      const page = await context.newPage();

      try {
        if (service === 'META_AI') {
          await page.goto('https://www.meta.ai', { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000);

          // Check for login buttons or overlay
          const hasLoginBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some((b) => /log in|sign in|sign up/i.test(b.textContent || ''));
          });

          const hasBlockingModal = await page.evaluate(() => {
            const body = document.body.innerText || '';
            return body.includes('Sign in to get started') || body.includes('Log in or sign up');
          });

          const cookies = await context.cookies();
          const hasAuthCookies = cookies.some((c) =>
            ['datr', 'c_user', 'sessionid', 'meta_session', 'dpr'].includes(c.name) ||
            c.name.toLowerCase().includes('session')
          );

          const isAuthenticated = !hasBlockingModal && (hasAuthCookies || !hasLoginBtn);
          const statusMessage = isAuthenticated
            ? 'Meta AI session active and authenticated. Ready for automated analysis.'
            : 'Meta AI requires interactive login. Launch desktop login or import session cookies.';

          this.lastVerifications.set(service, {
            timestamp: new Date(),
            isAuthenticated,
            statusMessage,
          });
          this.lastErrors.set(service, isAuthenticated ? null : 'Authentication required');

          return {
            service,
            isAvailable: true,
            isAuthenticated,
            requiresManualSetup: !isAuthenticated,
            lastChecked: new Date(),
            statusMessage,
            lastVerification: this.lastVerifications.get(service),
            lastAnalysisAttempt: this.lastAnalysisAttempts.get(service),
            lastError: this.lastErrors.get(service),
            profileDirMasked: `[BROWSER_PROFILES]/${path.basename(this.getProfileDir(service))}`,
            isInteractiveLoginActive: this.isInteractiveActive(service),
            hasStorageStateFile: this.hasStorageStateFile(service),
          };
        } else {
          // GROK
          await page.goto('https://grok.com', { timeout: 30000, waitUntil: 'domcontentloaded' });
          await page.waitForTimeout(3000);

          const hasSignInBtn = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button, a'));
            return btns.some((b) => /sign in|sign up/i.test(b.textContent || ''));
          });

          const cookies = await context.cookies();
          const hasAuthCookies = cookies.some((c) =>
            ['auth_token', 'twid', 'sso', 'ct0'].includes(c.name) ||
            c.name.toLowerCase().includes('session')
          );

          const isAuthenticated = !hasSignInBtn || hasAuthCookies;
          const statusMessage = isAuthenticated
            ? 'Grok session active and authenticated. Ready for automated analysis.'
            : 'Grok requires interactive login. Launch desktop login or import session cookies.';

          this.lastVerifications.set(service, {
            timestamp: new Date(),
            isAuthenticated,
            statusMessage,
          });
          this.lastErrors.set(service, isAuthenticated ? null : 'Authentication required');

          return {
            service,
            isAvailable: true,
            isAuthenticated,
            requiresManualSetup: !isAuthenticated,
            lastChecked: new Date(),
            statusMessage,
            lastVerification: this.lastVerifications.get(service),
            lastAnalysisAttempt: this.lastAnalysisAttempts.get(service),
            lastError: this.lastErrors.get(service),
            profileDirMasked: `[BROWSER_PROFILES]/${path.basename(this.getProfileDir(service))}`,
            isInteractiveLoginActive: this.isInteractiveActive(service),
            hasStorageStateFile: this.hasStorageStateFile(service),
          };
        }
      } finally {
        await page.close().catch(() => {});
      }
    } catch (err: any) {
      logger.error({ service, err: err.message }, 'Failed checking AI session status.');
      this.lastErrors.set(service, err.message);
      return {
        service,
        isAvailable: false,
        isAuthenticated: false,
        requiresManualSetup: true,
        lastChecked: new Date(),
        statusMessage: `Failed to connect to ${service}: ${err.message}`,
        lastVerification: this.lastVerifications.get(service),
        lastAnalysisAttempt: this.lastAnalysisAttempts.get(service),
        lastError: err.message,
        profileDirMasked: `[BROWSER_PROFILES]/${path.basename(this.getProfileDir(service))}`,
        isInteractiveLoginActive: this.isInteractiveActive(service),
        hasStorageStateFile: this.hasStorageStateFile(service),
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * Securely resets the browser session and purges cookies/profile cache for an AI service
   */
  public async resetSession(service: AIWebsite): Promise<{ success: boolean; message: string }> {
    const releaseLock = await this.acquireLock(service);
    try {
      logger.info({ service }, 'Admin requested session reset. Terminating browser context...');
      const existing = this.activeContexts.get(service);
      if (existing) {
        await existing.close().catch(() => {});
        this.activeContexts.delete(service);
      }

      const profileDir = this.getProfileDir(service);
      if (fs.existsSync(profileDir)) {
        try {
          fs.rmSync(profileDir, { recursive: true, force: true });
        } catch (rmErr: any) {
          logger.warn({ service, err: rmErr.message }, 'Could not remove entire profile directory; clearing files');
        }
      }
      fs.mkdirSync(profileDir, { recursive: true });

      this.lastVerifications.delete(service);
      this.lastErrors.set(service, null);
      logger.info({ service }, 'Browser profile reset complete.');

      return {
        success: true,
        message: `Persistent profile for ${service} has been reset. Interactive login is now required.`,
      };
    } catch (err: any) {
      logger.error({ service, err: err.message }, 'Error during session reset');
      return {
        success: false,
        message: `Failed resetting profile: ${err.message}`,
      };
    } finally {
      releaseLock();
    }
  }

  /**
   * Initializes or verifies the session for administrator setup
   */
  public async initializeSession(
    service: AIWebsite
  ): Promise<{ success: boolean; isAuthenticated: boolean; message: string; status: AiSessionStatus }> {
    logger.info({ service }, 'Administrator triggered session initialization/verification check.');
    const status = await this.checkSessionStatus(service);

    return {
      success: true,
      isAuthenticated: status.isAuthenticated,
      message: status.isAuthenticated
        ? `Session for ${service} is already authenticated and active.`
        : `Interactive login required for ${service}. Run npm run auth:${service === 'META_AI' ? 'meta' : 'grok'} in terminal to complete official authentication.`,
      status,
    };
  }

  /**
   * Launches headed desktop browser window for user to log into Meta AI or Grok manually
   */
  public async launchInteractiveLogin(service: AIWebsite): Promise<{
    success: boolean;
    message: string;
    targetUrl: string;
    isHeadlessOnly?: boolean;
    alreadyOpen?: boolean;
  }> {
    const isHeadlessOnly =
      (process.platform === 'linux' && !process.env.DISPLAY) || process.env.FORCE_HEADLESS === 'true';

    const targetUrl = service === 'META_AI' ? 'https://www.meta.ai/' : 'https://grok.com/';

    if (isHeadlessOnly) {
      return {
        success: false,
        isHeadlessOnly: true,
        message:
          'Headed desktop browser window cannot be opened in this headless/cloud environment (no desktop DISPLAY). Please use the "Import Session" option to import your session cookies.',
        targetUrl,
      };
    }

    if (this.activeInteractiveSessions.has(service)) {
      return {
        success: true,
        alreadyOpen: true,
        message: `Interactive login window for ${service} is already open on your desktop. Complete login and click "Save & Complete Login".`,
        targetUrl,
      };
    }

    logger.info({ service, targetUrl }, 'Launching interactive headed browser for user manual login...');

    // Close any background persistent context to avoid SQLite profile lock
    const existing = this.activeContexts.get(service);
    if (existing) {
      await existing.close().catch(() => {});
      this.activeContexts.delete(service);
    }

    const profileDir = this.getProfileDir(service);
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: false,
      viewport: { width: 1280, height: 850 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-infobars',
      ],
    });

    // Inject any existing cookies
    const storagePath = path.join(profileDir, 'storageState.json');
    if (fs.existsSync(storagePath)) {
      try {
        const raw = fs.readFileSync(storagePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.cookies) && parsed.cookies.length > 0) {
          await context.addCookies(parsed.cookies);
        }
      } catch {}
    }

    const page = await context.newPage();
    await page.goto(targetUrl, { timeout: 45000, waitUntil: 'domcontentloaded' }).catch((err) => {
      logger.warn({ service, err: err.message }, 'Initial navigation timeout, user can still proceed');
    });

    this.activeInteractiveSessions.set(service, { context, page, startedAt: new Date() });
    this.activeContexts.set(service, context);

    context.on('close', () => {
      logger.info({ service }, 'Interactive browser window closed.');
      this.activeInteractiveSessions.delete(service);
      this.activeContexts.delete(service);
    });

    return {
      success: true,
      message: `Chromium browser opened on your screen for ${service}. Please log into your account, then click "Save & Complete Login".`,
      targetUrl,
    };
  }

  /**
   * Saves storage state from interactive browser session and closes window
   */
  public async saveInteractiveLogin(service: AIWebsite): Promise<{
    success: boolean;
    isAuthenticated: boolean;
    message: string;
    status: AiSessionStatus;
  }> {
    logger.info({ service }, 'Saving interactive login session state...');
    const interactive = this.activeInteractiveSessions.get(service);
    const context = interactive?.context || this.activeContexts.get(service);

    const profileDir = this.getProfileDir(service);
    const storagePath = path.join(profileDir, 'storageState.json');

    if (context) {
      try {
        await context.storageState({ path: storagePath });
        const cookies = await context.cookies();
        fs.writeFileSync(path.join(profileDir, 'cookies.json'), JSON.stringify(cookies, null, 2));
        logger.info({ service, cookieCount: cookies.length }, 'Persisted storageState.json and cookies');
      } catch (err: any) {
        logger.warn({ service, err: err.message }, 'Could not capture full storageState from context');
      }

      await context.close().catch(() => {});
      this.activeInteractiveSessions.delete(service);
      this.activeContexts.delete(service);
    }

    // Now verify the session via fresh check
    const status = await this.checkSessionStatus(service);

    return {
      success: true,
      isAuthenticated: status.isAuthenticated,
      message: status.isAuthenticated
        ? `Session for ${service} has been successfully authenticated and saved!`
        : `Session saved, but site indicates login is still required. If you use 2FA, please complete it and retry.`,
      status,
    };
  }

  /**
   * Cancels active interactive login session and closes window without overwriting storageState
   */
  public async cancelInteractiveLogin(service: AIWebsite): Promise<{ success: boolean; message: string }> {
    const interactive = this.activeInteractiveSessions.get(service);
    if (interactive) {
      await interactive.context.close().catch(() => {});
      this.activeInteractiveSessions.delete(service);
      this.activeContexts.delete(service);
    }
    return {
      success: true,
      message: `Interactive login window for ${service} has been closed.`,
    };
  }

  /**
   * Imports session storage state (cookies / JSON) for Cloud MVP Hosting without display
   */
  public async importSessionState(
    service: AIWebsite,
    rawData: string
  ): Promise<{
    success: boolean;
    cookiesCount?: number;
    isAuthenticated?: boolean;
    message: string;
    status?: AiSessionStatus;
  }> {
    try {
      const trimmed = (rawData || '').trim();
      if (!trimmed) {
        return { success: false, message: 'Session data is empty. Please paste cookies or storageState JSON.' };
      }

      let cookies: any[] = [];
      let origins: any[] = [];

      try {
        let jsonText = trimmed;
        if (!jsonText.startsWith('{') && !jsonText.startsWith('[')) {
          // Attempt base64 decode
          try {
            jsonText = Buffer.from(jsonText, 'base64').toString('utf-8');
          } catch {}
        }

        const parsed = JSON.parse(jsonText);
        if (Array.isArray(parsed)) {
          cookies = parsed;
        } else if (parsed.cookies && Array.isArray(parsed.cookies)) {
          cookies = parsed.cookies;
          origins = parsed.origins || [];
        }
      } catch {
        // Parse as raw Cookie header: "key=val; key2=val2"
        const domain = service === 'META_AI' ? '.meta.ai' : '.grok.com';
        const pairs = trimmed.split(';');
        for (const pair of pairs) {
          const idx = pair.indexOf('=');
          if (idx > 0) {
            const name = pair.substring(0, idx).trim();
            const value = pair.substring(idx + 1).trim();
            if (name && value) {
              cookies.push({
                name,
                value,
                domain,
                path: '/',
                httpOnly: false,
                secure: true,
                sameSite: 'Lax',
              });
            }
          }
        }
      }

      if (cookies.length === 0) {
        return {
          success: false,
          message: 'Could not extract valid cookies. Format should be JSON storageState array or key=value header string.',
        };
      }

      // Standardize cookies for Playwright
      const defaultDomain = service === 'META_AI' ? '.meta.ai' : '.grok.com';
      const cleanCookies = cookies.map((c) => ({
        name: String(c.name),
        value: String(c.value),
        domain: String(c.domain || defaultDomain),
        path: String(c.path || '/'),
        httpOnly: Boolean(c.httpOnly),
        secure: typeof c.secure === 'boolean' ? c.secure : true,
        sameSite: c.sameSite === 'Strict' || c.sameSite === 'None' ? c.sameSite : 'Lax',
      }));

      const profileDir = this.getProfileDir(service);
      const storagePath = path.join(profileDir, 'storageState.json');
      fs.writeFileSync(storagePath, JSON.stringify({ cookies: cleanCookies, origins }, null, 2));

      // Close active contexts so new context boots with imported storageState
      const existing = this.activeContexts.get(service);
      if (existing) {
        await existing.close().catch(() => {});
        this.activeContexts.delete(service);
      }

      const status = await this.checkSessionStatus(service);

      return {
        success: true,
        cookiesCount: cleanCookies.length,
        isAuthenticated: status.isAuthenticated,
        status,
        message: status.isAuthenticated
          ? `Successfully imported ${cleanCookies.length} cookies. ${service} is authenticated and ready!`
          : `Imported ${cleanCookies.length} cookies, but site still reported unauthenticated. Verify session freshness.`,
      };
    } catch (err: any) {
      logger.error({ service, err: err.message }, 'Failed importing session state');
      return {
        success: false,
        message: `Failed importing session: ${err.message}`,
      };
    }
  }

  /**
   * Exports storage state JSON for transfer to Cloud MVP Hosting
   */
  public async exportSessionState(service: AIWebsite): Promise<{
    success: boolean;
    service: AIWebsite;
    storageState?: any;
    message: string;
  }> {
    const profileDir = this.getProfileDir(service);
    const storagePath = path.join(profileDir, 'storageState.json');

    if (fs.existsSync(storagePath)) {
      try {
        const raw = fs.readFileSync(storagePath, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          success: true,
          service,
          storageState: parsed,
          message: `Storage state for ${service} exported successfully.`,
        };
      } catch (err: any) {
        return {
          success: false,
          service,
          message: `Failed reading storageState.json: ${err.message}`,
        };
      }
    }

    // Try extracting from active context
    const context = this.activeContexts.get(service);
    if (context) {
      try {
        const state = await context.storageState();
        return {
          success: true,
          service,
          storageState: state,
          message: `Active session state for ${service} exported successfully.`,
        };
      } catch (err: any) {
        return {
          success: false,
          service,
          message: `Failed exporting state from active context: ${err.message}`,
        };
      }
    }

    return {
      success: false,
      service,
      message: `No active storageState file found for ${service}. Please log in or import cookies first.`,
    };
  }

  /**
   * Close all active browser contexts safely on process exit
   */
  public async closeAll(): Promise<void> {
    for (const [service, context] of this.activeContexts.entries()) {
      try {
        await context.close();
        logger.info({ service }, 'Closed browser context.');
      } catch (err) {
        logger.warn({ service, err }, 'Error closing context.');
      }
    }
    this.activeContexts.clear();
  }
}

export const browserSessionManager = BrowserSessionManager.getInstance();
