import { Request, Response } from 'express';
import { SocialAuthService } from '../services/socialAuthService.js';
import { AuthenticatedRequest, generateToken } from '../middleware/auth.js';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { UserModel } from '../models/User.js';
import { memoryStore } from '../models/memoryStore.js';
import { isDbConnected } from '../config/db.js';

export class SocialAuthController {
  /**
   * GET /api/auth/social/status - Public status of Instagram and X OAuth capability
   */
  public static getStatus(_req: Request, res: Response): void {
    const status = SocialAuthService.getProvidersConfigStatus();
    res.json(status);
  }

  /**
   * GET /api/auth/instagram - Initiate Instagram OAuth flow
   */
  public static initiateInstagram(req: AuthenticatedRequest, res: Response): void {
    const userId = req.user?.userId || 'guest_' + Date.now();
    const result = SocialAuthService.initiateInstagramAuth(userId);

    if (!result.configured || !result.url) {
      res.json({
        provider: 'INSTAGRAM',
        configured: false,
        authUrl: null,
        message:
          result.message ||
          'Instagram OAuth application credentials are not configured in server/.env. You can connect your analyst account directly below or via browser login.',
        devModeAvailable: true,
      });
      return;
    }

    if (req.query.redirect === 'true') {
      res.redirect(result.url);
      return;
    }

    res.json({
      provider: 'INSTAGRAM',
      configured: true,
      authUrl: result.url,
      state: result.state,
    });
  }

  /**
   * GET /api/auth/instagram/callback - Handle Instagram OAuth callback
   */
  public static async handleInstagramCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn({ error, error_description }, 'Instagram authorization cancelled or denied by user');
      const redirectUrl = `${config.clientOrigin}/login?error=${encodeURIComponent(
        String(error_description || error)
      )}&provider=INSTAGRAM`;
      res.redirect(redirectUrl);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state query parameter from Instagram callback.' });
      return;
    }

    const result = await SocialAuthService.handleInstagramCallback({
      code: String(code),
      state: String(state),
    });

    if (!result.success) {
      logger.error({ error: result.error }, 'Failed processing Instagram callback');
      const redirectUrl = `${config.clientOrigin}/login?error=${encodeURIComponent(
        result.error || 'Authorization failed'
      )}&provider=INSTAGRAM`;
      res.redirect(redirectUrl);
      return;
    }

    // Check if this was a pre-login / guest authorization
    let token: string | undefined;
    if (state && String(state).includes('guest_')) {
      // Find or create an Analyst account for this social user
      const username = result.connection?.providerUsername || 'analyst_ig';
      const email = `${username.toLowerCase()}@instagram.defense.agency`;

      let user: any;
      if (isDbConnected()) {
        user = await UserModel.findOne({ email });
        if (!user) {
          user = await UserModel.create({
            name: `Analyst (${result.connection?.providerUsername})`,
            email,
            passwordHash: 'social_oauth_managed',
            role: 'USER',
            accountStatus: 'ACTIVE',
          });
        }
      } else {
        user = Array.from(memoryStore.users.values()).find((u) => u.email === email);
        if (!user) {
          user = {
            _id: 'user_ig_' + Date.now(),
            name: `Analyst (${result.connection?.providerUsername})`,
            email,
            passwordHash: 'social_oauth_managed',
            role: 'USER' as const,
            accountStatus: 'ACTIVE' as const,
            notificationPreferences: {
              emailOnComplete: true,
              emailOnReviewNeeded: true,
              emailOnFailure: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryStore.users.set(user._id, user);
        }
      }

      token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    const redirectUrl = `${config.clientOrigin}/login?provider=INSTAGRAM&status=connected&username=${encodeURIComponent(
      result.connection?.providerUsername || ''
    )}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

    res.redirect(redirectUrl);
  }

  /**
   * GET /api/auth/x - Initiate X (Twitter) OAuth 2.0 with PKCE flow
   */
  public static initiateX(req: AuthenticatedRequest, res: Response): void {
    const userId = req.user?.userId || 'guest_' + Date.now();
    const result = SocialAuthService.initiateXAuth(userId);

    if (!result.configured || !result.url) {
      res.json({
        provider: 'X',
        configured: false,
        authUrl: null,
        message:
          result.message ||
          'X OAuth application credentials are not configured in server/.env. You can connect your analyst account directly below or via browser login.',
        devModeAvailable: true,
      });
      return;
    }

    if (req.query.redirect === 'true') {
      res.redirect(result.url);
      return;
    }

    res.json({
      provider: 'X',
      configured: true,
      authUrl: result.url,
      state: result.state,
    });
  }

  /**
   * GET /api/auth/x/callback - Handle X OAuth 2.0 PKCE callback
   */
  public static async handleXCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error, error_description } = req.query;

    if (error) {
      logger.warn({ error, error_description }, 'X authorization cancelled or denied by user');
      const redirectUrl = `${config.clientOrigin}/login?error=${encodeURIComponent(
        String(error_description || error)
      )}&provider=X`;
      res.redirect(redirectUrl);
      return;
    }

    if (!code || !state) {
      res.status(400).json({ error: 'Missing code or state query parameter from X callback.' });
      return;
    }

    const result = await SocialAuthService.handleXCallback({
      code: String(code),
      state: String(state),
    });

    if (!result.success) {
      logger.error({ error: result.error }, 'Failed processing X callback');
      const redirectUrl = `${config.clientOrigin}/login?error=${encodeURIComponent(
        result.error || 'Authorization failed'
      )}&provider=X`;
      res.redirect(redirectUrl);
      return;
    }

    // Check if this was a pre-login / guest authorization
    let token: string | undefined;
    if (state && String(state).includes('guest_')) {
      const username = result.connection?.providerUsername || 'analyst_x';
      const email = `${username.toLowerCase()}@x.defense.agency`;

      let user: any;
      if (isDbConnected()) {
        user = await UserModel.findOne({ email });
        if (!user) {
          user = await UserModel.create({
            name: `Analyst (@${result.connection?.providerUsername})`,
            email,
            passwordHash: 'social_oauth_managed',
            role: 'USER',
            accountStatus: 'ACTIVE',
          });
        }
      } else {
        user = Array.from(memoryStore.users.values()).find((u) => u.email === email);
        if (!user) {
          user = {
            _id: 'user_x_' + Date.now(),
            name: `Analyst (@${result.connection?.providerUsername})`,
            email,
            passwordHash: 'social_oauth_managed',
            role: 'USER' as const,
            accountStatus: 'ACTIVE' as const,
            notificationPreferences: {
              emailOnComplete: true,
              emailOnReviewNeeded: true,
              emailOnFailure: true,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          };
          memoryStore.users.set(user._id, user);
        }
      }

      token = generateToken({
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      });

      res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    const redirectUrl = `${config.clientOrigin}/login?provider=X&status=connected&username=${encodeURIComponent(
      result.connection?.providerUsername || ''
    )}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

    res.redirect(redirectUrl);
  }

  /**
   * GET /api/auth/connections - List all linked social connections for authenticated user
   */
  public static async getConnections(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const connections = await SocialAuthService.getUserConnections(userId);
      res.json({ connections });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error fetching linked accounts.' });
    }
  }

  /**
   * DELETE /api/auth/connections/:provider - Disconnect a social connection
   */
  public static async disconnect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const provider = String(req.params.provider).toUpperCase();

      if (provider !== 'INSTAGRAM' && provider !== 'X') {
        res.status(400).json({ error: 'Provider must be either INSTAGRAM or X.' });
        return;
      }

      const result = await SocialAuthService.disconnectProvider(userId, provider as 'INSTAGRAM' | 'X');
      if (!result.success) {
        res.status(404).json({ error: result.message });
        return;
      }

      res.json({ message: result.message, provider });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Error disconnecting account.' });
    }
  }

  /**
   * POST /api/auth/social/connect-direct - Connect Instagram or X account directly with a handle
   */
  public static async connectDirect(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { provider, username } = req.body;
      const provUpper = String(provider || '').toUpperCase();

      if (provUpper !== 'INSTAGRAM' && provUpper !== 'X') {
        res.status(400).json({ error: 'Provider must be either INSTAGRAM or X.' });
        return;
      }

      const result = await SocialAuthService.connectDirect({
        userId,
        provider: provUpper as 'INSTAGRAM' | 'X',
        username,
      });

      res.json({
        message: `Successfully connected ${provUpper} account as @${result.connection.providerUsername}.`,
        connection: result.connection,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed connecting social account.' });
    }
  }

  /**
   * POST /api/auth/social/browser-login - Launch desktop browser for official social account login
   */
  public static async browserLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { provider } = req.body;
      const provUpper = String(provider || '').toUpperCase();

      if (provUpper !== 'INSTAGRAM' && provUpper !== 'X') {
        res.status(400).json({ error: 'Provider must be either INSTAGRAM or X.' });
        return;
      }

      const result = await SocialAuthService.launchBrowserSocialLogin(provUpper as 'INSTAGRAM' | 'X');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed opening browser login window.' });
    }
  }

  /**
   * POST /api/auth/social/save-browser-login - Save cookies and link account from active browser window
   */
  public static async saveBrowserLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { provider, usernameHint } = req.body;
      const provUpper = String(provider || '').toUpperCase();

      if (provUpper !== 'INSTAGRAM' && provUpper !== 'X') {
        res.status(400).json({ error: 'Provider must be either INSTAGRAM or X.' });
        return;
      }

      const result = await SocialAuthService.saveBrowserSocialLogin(
        userId,
        provUpper as 'INSTAGRAM' | 'X',
        usernameHint
      );
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed saving social browser login.' });
    }
  }

  /**
   * POST /api/auth/social/cancel-browser-login - Close active social browser window without saving
   */
  public static async cancelBrowserLogin(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { provider } = req.body;
      const provUpper = String(provider || '').toUpperCase();

      if (provUpper !== 'INSTAGRAM' && provUpper !== 'X') {
        res.status(400).json({ error: 'Provider must be either INSTAGRAM or X.' });
        return;
      }

      const result = await SocialAuthService.cancelBrowserSocialLogin(provUpper as 'INSTAGRAM' | 'X');
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed cancelling social browser login.' });
    }
  }

  /**
   * POST /api/auth/social/import-session - Import cookies for Instagram or X in MVP Cloud Hosting
   */
  public static async importSession(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { provider, cookieData, username } = req.body;
      const provUpper = String(provider || '').toUpperCase();

      if (provUpper !== 'INSTAGRAM' && provUpper !== 'X') {
        res.status(400).json({ error: 'Provider must be either INSTAGRAM or X.' });
        return;
      }

      if (!cookieData || typeof cookieData !== 'string') {
        res.status(400).json({ error: 'Valid cookieData string is required.' });
        return;
      }

      const result = await SocialAuthService.importSocialSession({
        userId,
        provider: provUpper as 'INSTAGRAM' | 'X',
        cookieData,
        username,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed importing social session.' });
    }
  }
}
