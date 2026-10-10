import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { setDbConnectedForTesting } from '../config/db.js';
import { app } from '../app.js';
import { UserModel } from '../models/User.js';
import { AnalysisModel } from '../models/Analysis.js';
import { NotificationModel } from '../models/Notification.js';
import { ReviewModel } from '../models/Review.js';
import { SocialConnectionModel } from '../models/SocialConnection.js';

// In-memory test store
const store = {
  users: new Map<string, any>(),
  analyses: new Map<string, any>(),
  notifications: new Map<string, any>(),
  reviews: new Map<string, any>(),
};

describe('Deepfake Detection API Endpoints', () => {
  let authToken: string;
  let reviewerToken: string;
  let testUserId = '507f1f77bcf86cd799439011';
  let reviewerUserId = '507f1f77bcf86cd799439022';
  let createdJobId = '507f1f77bcf86cd799439033';

  beforeEach(async () => {
    setDbConnectedForTesting(true);

    // Reset and seed store
    store.users.clear();
    store.analyses.clear();
    store.notifications.clear();
    store.reviews.clear();

    const hashedPassword = bcrypt.hashSync('Password123!', 10);

    const userObj = {
      _id: { toString: () => testUserId },
      name: 'Analyst Jane',
      email: 'jane@defense.agency',
      passwordHash: hashedPassword,
      role: 'USER',
      accountStatus: 'ACTIVE',
      save: async function () { return this; },
    };

    const reviewerObj = {
      _id: { toString: () => reviewerUserId },
      name: 'Senior Reviewer',
      email: 'reviewer@defense.agency',
      passwordHash: hashedPassword,
      role: 'REVIEWER',
      accountStatus: 'ACTIVE',
      save: async function () { return this; },
    };

    const adminUserId = '507f1f77bcf86cd799439044';
    const adminObj = {
      _id: { toString: () => adminUserId },
      name: 'System Admin',
      email: 'admin@defense.agency',
      passwordHash: hashedPassword,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      save: async function () { return this; },
    };

    store.users.set(testUserId, userObj);
    store.users.set(reviewerUserId, reviewerObj);
    store.users.set(adminUserId, adminObj);

    // Mock UserModel
    vi.spyOn(UserModel, 'findOne').mockImplementation((query: any) => {
      for (const u of store.users.values()) {
        if (query.email && u.email === query.email) {
          return Promise.resolve(u) as any;
        }
      }
      return Promise.resolve(null) as any;
    });

    vi.spyOn(UserModel, 'findById').mockImplementation((id: any) => {
      const u = store.users.get(id?.toString());
      return {
        select: () => Promise.resolve(u),
      } as any;
    });

    vi.spyOn(UserModel, 'create').mockImplementation((data: any) => {
      const id = 'user_' + Date.now();
      const obj = {
        _id: { toString: () => id },
        ...data,
        accountStatus: 'ACTIVE',
        save: async function () { return this; },
      };
      store.users.set(id, obj);
      return Promise.resolve(obj) as any;
    });

    // Mock BrowserSessionManager checkSessionStatus to avoid slow network navigation in unit/integration tests
    const sessionMgr = (await import('../services/browserSessionManager.js')).BrowserSessionManager.getInstance();
    vi.spyOn(sessionMgr, 'checkSessionStatus').mockResolvedValue({
      service: 'GROK',
      isAvailable: true,
      isAuthenticated: false,
      requiresManualSetup: true,
      lastChecked: new Date(),
      statusMessage: 'Ready for setup',
    });

    // Mock AnalysisModel
    vi.spyOn(AnalysisModel, 'findOne').mockResolvedValue(null as any);
    vi.spyOn(AnalysisModel, 'create').mockImplementation((data: any) => {
      const obj = {
        _id: createdJobId,
        ...data,
        observations: [],
        limitations: [],
        createdAt: new Date(),
        save: async function () { return this; },
      };
      store.analyses.set(createdJobId, obj);
      return Promise.resolve(obj) as any;
    });

    vi.spyOn(AnalysisModel, 'findById').mockImplementation((id: any) => {
      const a = store.analyses.get(id?.toString()) || {
        _id: createdJobId,
        owner: { _id: testUserId, name: 'Analyst Jane', email: 'jane@defense.agency' },
        platform: 'X',
        aiWebsite: 'GROK',
        inputSourceType: 'ORIGINAL_POST_URL',
        jobStatus: 'PENDING',
        browserWorkflowStatus: 'Job Queued',
        observations: [],
        limitations: [],
        save: async function () { return this; },
      };
      return {
        populate: () => Promise.resolve(a),
        save: async function () { return a; },
        ...a,
      } as any;
    });

    vi.spyOn(AnalysisModel, 'find').mockImplementation(() => {
      const list = Array.from(store.analyses.values());
      const queryHelper: any = {
        sort: () => queryHelper,
        skip: () => queryHelper,
        limit: () => queryHelper,
        populate: () => Promise.resolve(list),
        then: (resolve: any) => resolve(list),
      };
      return queryHelper;
    });

    vi.spyOn(AnalysisModel, 'countDocuments').mockResolvedValue(1 as any);

    // Mock NotificationModel
    vi.spyOn(NotificationModel, 'create').mockImplementation((data: any) => {
      const notif = {
        _id: 'notif_' + Date.now(),
        ...data,
        createdAt: new Date(),
      };
      store.notifications.set(notif._id, notif);
      return Promise.resolve(notif) as any;
    });

    vi.spyOn(NotificationModel, 'find').mockImplementation(() => {
      const list = Array.from(store.notifications.values());
      return {
        sort: () => ({
          limit: () => ({
            populate: () => Promise.resolve(list),
          }),
        }),
      } as any;
    });

    vi.spyOn(NotificationModel, 'countDocuments').mockResolvedValue(0 as any);

    // Mock ReviewModel
    vi.spyOn(ReviewModel, 'find').mockImplementation(() => ({
      populate: () => Promise.resolve([]),
    } as any));

    vi.spyOn(ReviewModel, 'create').mockImplementation((data: any) => Promise.resolve({ _id: 'rev_1', ...data }) as any);

    // Mock SocialConnectionModel
    vi.spyOn(SocialConnectionModel, 'find').mockResolvedValue([] as any);
    vi.spyOn(SocialConnectionModel, 'findOneAndDelete').mockResolvedValue({ _id: 'conn_1' } as any);
    vi.spyOn(SocialConnectionModel, 'findOneAndUpdate').mockResolvedValue({ _id: 'conn_1' } as any);
  });

  describe('Health API', () => {
    it('GET /api/health returns healthy system status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.services.metaAiSupported).toBe(true);
      expect(res.body.services.grokSupported).toBe(true);
    });
  });

  describe('Platform Detection API (POST /api/platform/detect)', () => {
    it('detects Facebook URL and maps to META_AI without triggering browser analysis', async () => {
      const res = await request(app)
        .post('/api/platform/detect')
        .send({ url: 'https://www.facebook.com/reel/123456789' });

      expect(res.status).toBe(200);
      expect(res.body.platform).toBe('META');
      expect(res.body.selectedAiWebsite).toBe('META_AI');
      expect(res.body.isSupported).toBe(true);
      expect(res.body.mediaTypeHint).toBe('VIDEO');
    });

    it('detects X.com URL and maps to GROK', async () => {
      const res = await request(app)
        .post('/api/platform/detect')
        .send({ url: 'https://x.com/user/status/987654321' });

      expect(res.status).toBe(200);
      expect(res.body.platform).toBe('X');
      expect(res.body.selectedAiWebsite).toBe('GROK');
      expect(res.body.isSupported).toBe(true);
    });

    it('rejects deceptive phishing domain', async () => {
      const res = await request(app)
        .post('/api/platform/detect')
        .send({ url: 'https://facebook.com.malicious.net/post/1' });

      expect(res.status).toBe(200);
      expect(res.body.platform).toBe('UNSUPPORTED');
      expect(res.body.isSupported).toBe(false);
    });
  });

  describe('Authentication API', () => {
    it('POST /api/auth/register registers a standard user and sets JWT', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'New Officer',
        email: 'officer@defense.agency',
        password: 'Password123!',
      });

      expect(res.status).toBe(201);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('officer@defense.agency');
      expect(res.body.user.role).toBe('USER');
    });

    it('POST /api/auth/login validates credentials and issues token', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'jane@defense.agency',
        password: 'Password123!',
      });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      authToken = res.body.token;
    });

    it('POST /api/auth/login rejects wrong password', async () => {
      const res = await request(app).post('/api/auth/login').send({
        email: 'jane@defense.agency',
        password: 'WrongPassword!',
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Invalid email or password');
    });

    it('GET /api/auth/me returns current user profile with valid Bearer token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('jane@defense.agency');
    });

    it('GET /api/auth/me rejects unauthorized request', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('GET /api/auth/social/status returns configuration and guidance for Instagram and X', async () => {
      const res = await request(app).get('/api/auth/social/status');
      expect(res.status).toBe(200);
      expect(res.body.instagram).toBeDefined();
      expect(res.body.x).toBeDefined();
      expect(res.body.instagram.portalUrl).toContain('facebook.com');
      expect(res.body.x.portalUrl).toContain('x.com');
    });

    it('GET /api/auth/instagram handles unconfigured environment gracefully', async () => {
      const res = await request(app).get('/api/auth/instagram');
      expect([200, 503]).toContain(res.status);
      if (res.status === 503) {
        expect(res.body.configured).toBe(false);
        expect(res.body.setupGuide).toBeDefined();
      }
    });

    it('GET /api/auth/x handles unconfigured environment gracefully', async () => {
      const res = await request(app).get('/api/auth/x');
      expect([200, 503]).toContain(res.status);
      if (res.status === 503) {
        expect(res.body.configured).toBe(false);
        expect(res.body.setupGuide).toBeDefined();
      }
    });

    it('GET /api/auth/instagram/callback rejects missing code and state', async () => {
      const res = await request(app).get('/api/auth/instagram/callback');
      expect(res.status).toBe(400);
    });

    it('GET /api/auth/x/callback rejects invalid or expired state token', async () => {
      const res = await request(app).get('/api/auth/x/callback?code=test_code&state=invalid_tampered_state');
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('error=');
    });

    it('GET /api/auth/connections requires authentication', async () => {
      const unauthRes = await request(app).get('/api/auth/connections');
      expect(unauthRes.status).toBe(401);

      const authRes = await request(app)
        .get('/api/auth/connections')
        .set('Authorization', `Bearer ${authToken}`);
      expect(authRes.status).toBe(200);
      expect(authRes.body.connections).toBeInstanceOf(Array);
    });

    it('DELETE /api/auth/connections/:provider rejects unsupported provider', async () => {
      const res = await request(app)
        .delete('/api/auth/connections/TIKTOK')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(400);
    });
  });

  describe('Analysis API & Job Queue', () => {
    it('POST /api/analysis rejects submission without auth', async () => {
      const res = await request(app)
        .post('/api/analysis')
        .send({ url: 'https://x.com/user/status/111' });

      expect(res.status).toBe(401);
    });

    it('POST /api/analysis accepts valid X URL and queues job', async () => {
      const res = await request(app)
        .post('/api/analysis')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ url: 'https://x.com/user/status/111222333' });

      expect(res.status).toBe(202);
      expect(res.body.jobId).toBeDefined();
      expect(res.body.platform).toBe('X');
      expect(res.body.aiWebsite).toBe('GROK');
    });

    it('GET /api/analysis/:id returns the job details', async () => {
      const res = await request(app)
        .get(`/api/analysis/${createdJobId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.analysis).toBeDefined();
      expect(res.body.analysis.platform).toBe('X');
    });

    it('GET /api/analysis lists user jobs with pagination', async () => {
      const res = await request(app)
        .get('/api/analysis?page=1&limit=5')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.items).toBeInstanceOf(Array);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(1);
    });

    it('POST /api/analysis/:id/manual-result records manual verification findings', async () => {
      const res = await request(app)
        .post(`/api/analysis/${createdJobId}/manual-result`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          manualResponseText:
            'Grok analysis observations: This video is a deepfake manipulated with synthetic media, showing artificial facial alteration and diffusion artifacts.',
          aiWebsiteUsed: 'GROK',
          notes: 'Analyst verified independently in Grok web session.',
        });

      expect(res.status).toBe(200);
      expect(res.body.analysis.inputSourceType).toBe('MANUAL_ENTRY');
      expect(res.body.analysis.resultCategory).toBe('POTENTIAL_MANIPULATION');
      expect(res.body.analysis.actualAiResponse).toContain('[MANUALLY SUBMITTED BY USER]');
    });
  });

  describe('Reviewer API & Role-Based Access Control', () => {
    it('GET /api/reviews denies regular USER role', async () => {
      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(403);
    });

    it('GET /api/reviews allows REVIEWER role', async () => {
      // Login as reviewer
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'reviewer@defense.agency',
        password: 'Password123!',
      });
      reviewerToken = loginRes.body.token;

      const res = await request(app)
        .get('/api/reviews')
        .set('Authorization', `Bearer ${reviewerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.cases).toBeInstanceOf(Array);
    });
  });

  describe('Notifications API', () => {
    it('POST /api/notifications/test generates a user test notification', async () => {
      const res = await request(app)
        .post('/api/notifications/test')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notification.channel).toBe('IN_APP');
    });

    it('GET /api/notifications lists notifications for user', async () => {
      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.notifications).toBeInstanceOf(Array);
    });
  });

  describe('Admin Browser Session Management API & Role Controls', () => {
    let adminToken: string;

    beforeEach(async () => {
      const loginRes = await request(app).post('/api/auth/login').send({
        email: 'admin@defense.agency',
        password: 'Password123!',
      });
      adminToken = loginRes.body.token;
    });

    it('denies unauthenticated requests to session endpoints', async () => {
      const res = await request(app).post('/api/ai/status/META_AI/verify');
      expect(res.status).toBe(401);
    });

    it('denies ordinary USER role access to session management', async () => {
      const res = await request(app)
        .post('/api/ai/status/META_AI/verify')
        .set('Authorization', `Bearer ${authToken}`);
      expect(res.status).toBe(403);
    });

    it('allows ADMIN role to verify session status for META_AI and GROK', async () => {
      const resMeta = await request(app)
        .post('/api/ai/status/META_AI/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resMeta.status).toBe(200);
      expect(resMeta.body.service).toBe('META_AI');

      const resGrok = await request(app)
        .post('/api/ai/status/GROK/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(resGrok.status).toBe(200);
      expect(resGrok.body.service).toBe('GROK');
    });

    it('allows ADMIN role to reset persistent profile cache', async () => {
      const res = await request(app)
        .post('/api/ai/status/META_AI/reset')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects invalid service identifiers with 400', async () => {
      const res = await request(app)
        .post('/api/ai/status/INVALID_SERVICE/verify')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
    });

    it('allows ADMIN to import valid session cookies into storageState', async () => {
      const mockStorageState = JSON.stringify({
        cookies: [
          {
            name: 'datr',
            value: 'mock_datr_1234567890',
            domain: '.meta.ai',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'Lax',
          },
        ],
        origins: [],
      });

      const res = await request(app)
        .post('/api/ai/status/META_AI/import-session')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ sessionData: mockStorageState });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.cookiesCount).toBe(1);
    });

    it('allows ADMIN to export storageState JSON', async () => {
      const res = await request(app)
        .get('/api/ai/status/META_AI/export-session')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.storageState).toBeDefined();
    });
  });

  describe('Health Check & Database Diagnostics API', () => {
    it('GET /api/health returns HEALTHY status and database connection state', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('HEALTHY');
      expect(res.body.database).toBeDefined();
      expect(res.body.services.metaAiSupported).toBe(true);
      expect(res.body.services.grokSupported).toBe(true);
    });
  });

  describe('Authentication Security & Conflict Handling', () => {
    it('rejects duplicate email registration with 409 Conflict', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Duplicate Jane',
        email: 'jane@defense.agency',
        password: 'NewPassword123!',
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('rejects registration with short password with 400 Bad Request', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Short Password User',
        email: 'short@defense.agency',
        password: '123',
      });
      expect(res.status).toBe(400);
    });
  });
});
