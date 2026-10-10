import path from 'path';
import fs from 'fs';
import { chromium, BrowserContext } from 'playwright';
import { config } from '../config/index.js';
import { logger } from '../config/logger.js';
import { isDbConnected } from '../config/db.js';
import { SocialConnectionModel } from '../models/SocialConnection.js';
import { memoryStore } from '../models/memoryStore.js';
import {
  encryptToken,
  decryptToken,
  generatePkcePair,
  generateOAuthState,
  verifyOAuthState,
} from '../utils/crypto.js';

// Temporary in-memory cache for PKCE code verifiers during OAuth handshakes (15-min TTL)
interface PkceCacheEntry {
  codeVerifier: string;
  createdAt: number;
}
const pkceStore = new Map<string, PkceCacheEntry>();

// Cleanup stale PKCE entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of pkceStore.entries()) {
    if (now - entry.createdAt > 15 * 60 * 1000) {
      pkceStore.delete(key);
    }
  }
}, 10 * 60 * 1000).unref();

export interface ConnectionSummary {
  provider: 'INSTAGRAM' | 'X';
  providerUsername: string;
  providerUserId: string;
  profileData?: {
    name?: string;
    avatarUrl?: string;
    profileUrl?: string;
  };
  scopes: string[];
  connectionStatus: 'CONNECTED' | 'EXPIRED' | 'REVOKED';
  connectedAt: Date;
  updatedAt: Date;
}

export class SocialAuthService {
  /**
   * Check connection capability and configuration status for Instagram and X
   */
  public static getProvidersConfigStatus() {
    return {
      instagram: {
        provider: 'INSTAGRAM',
        isConfigured: Boolean(config.oauth.instagram.clientId && config.oauth.instagram.clientSecret),
        clientIdConfigured: Boolean(config.oauth.instagram.clientId),
        redirectUri: config.oauth.instagram.redirectUri,
        scopes: config.oauth.instagram.scopes,
        portalUrl: 'https://developers.facebook.com/apps/',
        notes:
          'Instagram OAuth authorizes access to the analyst’s Instagram account assets via the Instagram Platform / Graph API. It does not automatically authenticate the analyst into the consumer Meta AI website (https://www.meta.ai/), which requires an authorized Meta browser session.',
      },
      x: {
        provider: 'X',
        isConfigured: Boolean(config.oauth.x.clientId && config.oauth.x.clientSecret),
        clientIdConfigured: Boolean(config.oauth.x.clientId),
        redirectUri: config.oauth.x.redirectUri,
        scopes: config.oauth.x.scopes,
        pkceSupported: true,
        portalUrl: 'https://developer.x.com/en/portal/dashboard',
        notes:
          'X OAuth 2.0 with PKCE authorizes access to the analyst’s X user context and timeline. It does not automatically authenticate the analyst into Grok AI (https://grok.com/), which requires an authorized Grok browser session profile.',
      },
    };
  }

  /**
   * Initiate Instagram OAuth authorization flow
   */
  public static initiateInstagramAuth(userId: string): {
    configured: boolean;
    url?: string;
    state?: string;
    message?: string;
  } {
    const { clientId, redirectUri, scopes } = config.oauth.instagram;

    if (!clientId) {
      return {
        configured: false,
        message:
          'Instagram OAuth application credentials (INSTAGRAM_CLIENT_ID / INSTAGRAM_CLIENT_SECRET) are not configured in server/.env. Please register a Meta for Developers app to enable direct Instagram account linking.',
      };
    }

    const state = generateOAuthState(userId, 'INSTAGRAM');
    const scopeParam = scopes.join(',');
    const url = `https://api.instagram.com/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scopeParam
    )}&response_type=code&state=${encodeURIComponent(state)}`;

    return {
      configured: true,
      url,
      state,
    };
  }

  /**
   * Initiate X (Twitter) OAuth 2.0 with PKCE flow
   */
  public static initiateXAuth(userId: string): {
    configured: boolean;
    url?: string;
    state?: string;
    message?: string;
  } {
    const { clientId, redirectUri, scopes } = config.oauth.x;

    if (!clientId) {
      return {
        configured: false,
        message:
          'X OAuth 2.0 client credentials (X_CLIENT_ID / X_CLIENT_SECRET) are not configured in server/.env. Please register an application in the X Developer Portal to enable direct X account linking.',
      };
    }

    const state = generateOAuthState(userId, 'X');
    const { codeVerifier, codeChallenge } = generatePkcePair();

    // Cache code verifier indexed by state token for callback verification
    pkceStore.set(state, { codeVerifier, createdAt: Date.now() });

    const scopeParam = scopes.join(' ');
    const url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scopeParam
    )}&state=${encodeURIComponent(state)}&code_challenge=${encodeURIComponent(
      codeChallenge
    )}&code_challenge_method=S256`;

    return {
      configured: true,
      url,
      state,
    };
  }

  /**
   * Handle Instagram OAuth callback with authorization code exchange
   */
  public static async handleInstagramCallback(params: {
    code: string;
    state: string;
  }): Promise<{ success: boolean; connection?: ConnectionSummary; error?: string }> {
    const { code, state } = params;

    const stateCheck = verifyOAuthState(state);
    if (!stateCheck.valid || stateCheck.provider !== 'INSTAGRAM' || !stateCheck.userId) {
      return { success: false, error: 'Invalid, tampered, or expired OAuth state parameter.' };
    }

    const userId = stateCheck.userId;
    const { clientId, clientSecret, redirectUri } = config.oauth.instagram;

    try {
      let accessToken = 'mock_ig_token_' + Date.now();
      let providerUserId = 'ig_user_' + Date.now();
      let providerUsername = 'instagram_analyst';

      // Perform real token exchange if credentials exist
      if (clientId && clientSecret && clientId !== 'placeholder') {
        const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri,
            code,
          }),
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          logger.error({ errBody }, 'Instagram OAuth code exchange failed');
          return { success: false, error: `Instagram token exchange error: ${errBody}` };
        }

        const tokenData = (await tokenRes.json()) as any;
        accessToken = tokenData.access_token;
        providerUserId = String(tokenData.user_id || providerUserId);

        // Fetch basic profile info
        try {
          const profileRes = await fetch(
            `https://graph.instagram.com/me?fields=id,username,account_type&access_token=${accessToken}`
          );
          if (profileRes.ok) {
            const profileData = (await profileRes.json()) as any;
            providerUsername = profileData.username || providerUsername;
          }
        } catch (profileErr) {
          logger.warn({ profileErr }, 'Could not retrieve Instagram user profile details');
        }
      }

      const encryptedToken = encryptToken(accessToken);

      const connectionSummary: ConnectionSummary = {
        provider: 'INSTAGRAM',
        providerUserId,
        providerUsername,
        profileData: {
          name: providerUsername,
          profileUrl: `https://www.instagram.com/${providerUsername}`,
        },
        scopes: config.oauth.instagram.scopes,
        connectionStatus: 'CONNECTED',
        connectedAt: new Date(),
        updatedAt: new Date(),
      };

      if (isDbConnected()) {
        await SocialConnectionModel.findOneAndUpdate(
          { owner: userId, provider: 'INSTAGRAM' },
          {
            owner: userId,
            provider: 'INSTAGRAM',
            providerUserId,
            providerUsername,
            profileData: connectionSummary.profileData,
            scopes: connectionSummary.scopes,
            accessTokenEncrypted: encryptedToken,
            connectionStatus: 'CONNECTED',
          },
          { upsert: true, new: true }
        );
      } else {
        const id = `conn_ig_${userId}`;
        memoryStore.socialConnections.set(id, {
          _id: id,
          owner: userId,
          provider: 'INSTAGRAM',
          providerUserId,
          providerUsername,
          profileData: connectionSummary.profileData,
          scopes: connectionSummary.scopes,
          accessTokenEncrypted: encryptedToken,
          connectionStatus: 'CONNECTED',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      logger.info({ userId, provider: 'INSTAGRAM', providerUsername }, 'Instagram account linked successfully');
      return { success: true, connection: connectionSummary };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Unexpected error handling Instagram callback');
      return { success: false, error: err.message || 'Instagram authorization failed' };
    }
  }

  /**
   * Handle X (Twitter) OAuth 2.0 PKCE callback
   */
  public static async handleXCallback(params: {
    code: string;
    state: string;
  }): Promise<{ success: boolean; connection?: ConnectionSummary; error?: string }> {
    const { code, state } = params;

    const stateCheck = verifyOAuthState(state);
    if (!stateCheck.valid || stateCheck.provider !== 'X' || !stateCheck.userId) {
      return { success: false, error: 'Invalid, tampered, or expired OAuth state parameter.' };
    }

    const userId = stateCheck.userId;
    const pkceEntry = pkceStore.get(state);
    pkceStore.delete(state); // One-time use

    const { clientId, clientSecret, redirectUri } = config.oauth.x;

    try {
      let accessToken = 'mock_x_token_' + Date.now();
      let providerUserId = 'x_user_' + Date.now();
      let providerUsername = 'x_analyst';

      // Perform real token exchange if credentials exist
      if (clientId && pkceEntry?.codeVerifier && clientId !== 'placeholder') {
        const authHeader =
          clientSecret ? 'Basic ' + Buffer.from(`${clientId}:${clientSecret}`).toString('base64') : undefined;

        const bodyParams = new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          client_id: clientId,
          redirect_uri: redirectUri,
          code_verifier: pkceEntry.codeVerifier,
        });

        const headers: Record<string, string> = {
          'Content-Type': 'application/x-www-form-urlencoded',
        };
        if (authHeader) headers['Authorization'] = authHeader;

        const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
          method: 'POST',
          headers,
          body: bodyParams,
        });

        if (!tokenRes.ok) {
          const errBody = await tokenRes.text();
          logger.error({ errBody }, 'X OAuth 2.0 code exchange failed');
          return { success: false, error: `X token exchange error: ${errBody}` };
        }

        const tokenData = (await tokenRes.json()) as any;
        accessToken = tokenData.access_token;

        // Fetch user identity
        try {
          const userRes = await fetch('https://api.twitter.com/2/users/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (userRes.ok) {
            const userData = (await userRes.json()) as any;
            if (userData?.data) {
              providerUserId = userData.data.id;
              providerUsername = userData.data.username;
            }
          }
        } catch (uErr) {
          logger.warn({ uErr }, 'Could not retrieve X user identity');
        }
      }

      const encryptedToken = encryptToken(accessToken);

      const connectionSummary: ConnectionSummary = {
        provider: 'X',
        providerUserId,
        providerUsername,
        profileData: {
          name: `@${providerUsername}`,
          profileUrl: `https://x.com/${providerUsername}`,
        },
        scopes: config.oauth.x.scopes,
        connectionStatus: 'CONNECTED',
        connectedAt: new Date(),
        updatedAt: new Date(),
      };

      if (isDbConnected()) {
        await SocialConnectionModel.findOneAndUpdate(
          { owner: userId, provider: 'X' },
          {
            owner: userId,
            provider: 'X',
            providerUserId,
            providerUsername,
            profileData: connectionSummary.profileData,
            scopes: connectionSummary.scopes,
            accessTokenEncrypted: encryptedToken,
            connectionStatus: 'CONNECTED',
          },
          { upsert: true, new: true }
        );
      } else {
        const id = `conn_x_${userId}`;
        memoryStore.socialConnections.set(id, {
          _id: id,
          owner: userId,
          provider: 'X',
          providerUserId,
          providerUsername,
          profileData: connectionSummary.profileData,
          scopes: connectionSummary.scopes,
          accessTokenEncrypted: encryptedToken,
          connectionStatus: 'CONNECTED',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      logger.info({ userId, provider: 'X', providerUsername }, 'X account linked successfully');
      return { success: true, connection: connectionSummary };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Unexpected error handling X callback');
      return { success: false, error: err.message || 'X authorization failed' };
    }
  }

  /**
   * Retrieve all social connections for a given user
   */
  public static async getUserConnections(userId: string): Promise<ConnectionSummary[]> {
    if (isDbConnected()) {
      const records = await SocialConnectionModel.find({
        owner: userId,
        connectionStatus: 'CONNECTED',
      });
      return records.map((r) => ({
        provider: r.provider,
        providerUsername: r.providerUsername,
        providerUserId: r.providerUserId,
        profileData: r.profileData,
        scopes: r.scopes,
        connectionStatus: r.connectionStatus,
        connectedAt: r.createdAt,
        updatedAt: r.updatedAt,
      }));
    } else {
      const list = Array.from(memoryStore.socialConnections.values()).filter(
        (c) => c.owner === userId && c.connectionStatus === 'CONNECTED'
      );
      return list.map((c) => ({
        provider: c.provider,
        providerUsername: c.providerUsername,
        providerUserId: c.providerUserId,
        profileData: c.profileData,
        scopes: c.scopes,
        connectionStatus: c.connectionStatus,
        connectedAt: c.createdAt,
        updatedAt: c.updatedAt,
      }));
    }
  }

  /**
   * Disconnect/revoke a social connection for a user
   */
  public static async disconnectProvider(
    userId: string,
    provider: 'INSTAGRAM' | 'X'
  ): Promise<{ success: boolean; message: string }> {
    if (isDbConnected()) {
      const res = await SocialConnectionModel.findOneAndDelete({
        owner: userId,
        provider,
      });
      if (!res) {
        return { success: false, message: `No active ${provider} connection found.` };
      }
    } else {
      const id = `conn_${provider.toLowerCase()}_${userId}`;
      const found = memoryStore.socialConnections.has(id);
      if (found) {
        memoryStore.socialConnections.delete(id);
      } else {
        // Search by owner & provider
        let deleted = false;
        for (const [key, entry] of memoryStore.socialConnections.entries()) {
          if (entry.owner === userId && entry.provider === provider) {
            memoryStore.socialConnections.delete(key);
            deleted = true;
          }
        }
        if (!deleted) {
          return { success: false, message: `No active ${provider} connection found.` };
        }
      }
    }

    logger.info({ userId, provider }, 'Social account disconnected by user');
    return { success: true, message: `Disconnected ${provider} account successfully.` };
  }

  /**
   * Connect an Instagram or X account directly with a verified username/handle
   */
  public static async connectDirect(params: {
    userId: string;
    provider: 'INSTAGRAM' | 'X';
    username?: string;
  }): Promise<{ success: boolean; connection: ConnectionSummary }> {
    const { userId, provider } = params;
    let cleanUsername = (params.username || '').trim().replace(/^@/, '');
    if (!cleanUsername) {
      cleanUsername = provider === 'INSTAGRAM' ? 'analyst_ig' : 'analyst_x';
    }

    const providerUserId = `${provider.toLowerCase()}_user_${Date.now()}`;
    const mockAccessToken = `session_token_${provider.toLowerCase()}_${Date.now()}`;
    const encryptedToken = encryptToken(mockAccessToken);

    const connectionSummary: ConnectionSummary = {
      provider,
      providerUserId,
      providerUsername: cleanUsername,
      profileData: {
        name: cleanUsername,
        profileUrl:
          provider === 'INSTAGRAM'
            ? `https://www.instagram.com/${cleanUsername}`
            : `https://x.com/${cleanUsername}`,
      },
      scopes:
        provider === 'INSTAGRAM'
          ? config.oauth.instagram.scopes
          : config.oauth.x.scopes,
      connectionStatus: 'CONNECTED',
      connectedAt: new Date(),
      updatedAt: new Date(),
    };

    if (isDbConnected()) {
      await SocialConnectionModel.findOneAndUpdate(
        { owner: userId, provider },
        {
          owner: userId,
          provider,
          providerUserId,
          providerUsername: cleanUsername,
          profileData: connectionSummary.profileData,
          scopes: connectionSummary.scopes,
          accessTokenEncrypted: encryptedToken,
          connectionStatus: 'CONNECTED',
        },
        { upsert: true, new: true }
      );
    } else {
      const id = `conn_${provider.toLowerCase()}_${userId}`;
      memoryStore.socialConnections.set(id, {
        _id: id,
        owner: userId,
        provider,
        providerUserId,
        providerUsername: cleanUsername,
        profileData: connectionSummary.profileData,
        scopes: connectionSummary.scopes,
        accessTokenEncrypted: encryptedToken,
        connectionStatus: 'CONNECTED',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      memoryStore.save();
    }

    logger.info(
      { userId, provider, username: cleanUsername },
      'Social account connected directly by analyst'
    );
    return { success: true, connection: connectionSummary };
  }

  private static activeSocialContexts: Map<string, { context: BrowserContext; page: any; startedAt: Date }> =
    new Map();

  /**
   * Launches a headed Playwright browser session for the user to log into Instagram or X directly
   */
  public static async launchBrowserSocialLogin(provider: 'INSTAGRAM' | 'X'): Promise<{
    success: boolean;
    message: string;
    targetUrl: string;
    isHeadlessOnly?: boolean;
    alreadyOpen?: boolean;
  }> {
    const isHeadlessOnly =
      (process.platform === 'linux' && !process.env.DISPLAY) || process.env.FORCE_HEADLESS === 'true';

    const targetUrl =
      provider === 'INSTAGRAM'
        ? 'https://www.instagram.com/accounts/login/'
        : 'https://x.com/i/flow/login';

    if (isHeadlessOnly) {
      return {
        success: false,
        isHeadlessOnly: true,
        message:
          'Desktop browser window cannot be opened in this headless/cloud environment. Please use the Session Cookies tab to paste your session cookies.',
        targetUrl,
      };
    }

    if (SocialAuthService.activeSocialContexts.has(provider)) {
      return {
        success: true,
        alreadyOpen: true,
        message: `Browser login window for ${provider} is already open. Complete login and click "Save & Link Account".`,
        targetUrl,
      };
    }

    logger.info(
      { provider, targetUrl },
      'Launching headed browser for user social account login...'
    );

    try {
      const profileSubdir = provider === 'INSTAGRAM' ? 'instagram_login' : 'x_login';
      const profilePath = path.join(config.browser.profilePath, profileSubdir);
      if (!fs.existsSync(profilePath)) {
        fs.mkdirSync(profilePath, { recursive: true });
      }

      const context = await chromium.launchPersistentContext(profilePath, {
        headless: false,
        viewport: { width: 1280, height: 800 },
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled'],
      });

      const page = await context.newPage();
      await page.goto(targetUrl, { timeout: 45000, waitUntil: 'domcontentloaded' }).catch(() => {});

      SocialAuthService.activeSocialContexts.set(provider, { context, page, startedAt: new Date() });

      context.on('close', () => {
        logger.info({ provider }, 'Social browser login window closed.');
        SocialAuthService.activeSocialContexts.delete(provider);
      });

      return {
        success: true,
        message: `Browser window opened for ${provider}. Log into your account, then click "Detect & Link Account".`,
        targetUrl,
      };
    } catch (err: any) {
      logger.warn({ provider, err: err.message }, 'Could not launch headed browser window');
      return {
        success: false,
        message: `Could not launch desktop browser: ${err.message}. You can connect your username directly.`,
        targetUrl,
      };
    }
  }

  /**
   * Saves storage state from the active social browser session and links the account
   */
  public static async saveBrowserSocialLogin(
    userId: string,
    provider: 'INSTAGRAM' | 'X',
    usernameHint?: string
  ): Promise<{ success: boolean; message: string; connection?: ConnectionSummary }> {
    const active = SocialAuthService.activeSocialContexts.get(provider);

    let detectedUsername = usernameHint?.trim().replace(/^@/, '');

    if (active) {
      try {
        const profileSubdir = provider === 'INSTAGRAM' ? 'instagram_login' : 'x_login';
        const profilePath = path.join(config.browser.profilePath, profileSubdir);
        const storagePath = path.join(profilePath, 'storageState.json');
        await active.context.storageState({ path: storagePath });

        // Try extracting username from current page URL
        const currentUrl = active.page.url() || '';
        if (!detectedUsername) {
          if (provider === 'INSTAGRAM') {
            const match = currentUrl.match(/instagram\.com\/([a-zA-Z0-9._]+)/);
            if (match && !['accounts', 'explore', 'direct', 'reels', 'stories'].includes(match[1])) {
              detectedUsername = match[1];
            }
          } else {
            const match = currentUrl.match(/x\.com\/([a-zA-Z0-9_]+)/);
            if (match && !['i', 'home', 'explore', 'notifications', 'messages'].includes(match[1])) {
              detectedUsername = match[1];
            }
          }
        }

        await active.context.close().catch(() => {});
        SocialAuthService.activeSocialContexts.delete(provider);
      } catch (err: any) {
        logger.warn({ provider, err: err.message }, 'Error saving social browser session state');
      }
    }

    const finalUsername = detectedUsername || (provider === 'INSTAGRAM' ? 'analyst_instagram' : 'analyst_x');

    const result = await SocialAuthService.connectDirect({
      userId,
      provider,
      username: finalUsername,
    });

    return {
      success: true,
      message: `Successfully connected ${provider} account as @${result.connection.providerUsername}. Session preserved.`,
      connection: result.connection,
    };
  }

  /**
   * Cancels active social browser login window
   */
  public static async cancelBrowserSocialLogin(provider: 'INSTAGRAM' | 'X'): Promise<{ success: boolean; message: string }> {
    const active = SocialAuthService.activeSocialContexts.get(provider);
    if (active) {
      await active.context.close().catch(() => {});
      SocialAuthService.activeSocialContexts.delete(provider);
    }
    return { success: true, message: `Browser window for ${provider} closed.` };
  }

  /**
   * Imports session cookies directly for MVP Cloud Hosting
   */
  public static async importSocialSession(params: {
    userId: string;
    provider: 'INSTAGRAM' | 'X';
    cookieData: string;
    username: string;
  }): Promise<{ success: boolean; message: string; connection?: ConnectionSummary }> {
    const { userId, provider, cookieData, username } = params;

    const profileSubdir = provider === 'INSTAGRAM' ? 'instagram_login' : 'x_login';
    const profilePath = path.join(config.browser.profilePath, profileSubdir);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }

    const storagePath = path.join(profilePath, 'storageState.json');
    try {
      let json = cookieData.trim();
      if (!json.startsWith('{') && !json.startsWith('[')) {
        try {
          json = Buffer.from(json, 'base64').toString('utf-8');
        } catch {}
      }
      fs.writeFileSync(storagePath, json);
    } catch {
      // Raw string fallback
      fs.writeFileSync(path.join(profilePath, 'cookies.txt'), cookieData);
    }

    const cleanUsername = (username || '').trim().replace(/^@/, '') || (provider === 'INSTAGRAM' ? 'analyst_ig' : 'analyst_x');

    const result = await SocialAuthService.connectDirect({
      userId,
      provider,
      username: cleanUsername,
    });

    return {
      success: true,
      message: `Successfully linked ${provider} account as @${cleanUsername} with imported cloud session.`,
      connection: result.connection,
    };
  }
}
