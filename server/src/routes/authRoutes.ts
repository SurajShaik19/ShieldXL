import { Router } from 'express';
import { AuthController } from '../controllers/authController.js';
import { SocialAuthController } from '../controllers/socialAuthController.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

router.post('/register', authRateLimiter, AuthController.register);
router.post('/login', authRateLimiter, AuthController.login);
router.post('/logout', AuthController.logout);
router.get('/me', requireAuth, AuthController.me);

// Social Media Account Linking & Authorization (Instagram & X)
router.get('/social/status', SocialAuthController.getStatus);
router.post('/social/connect-direct', requireAuth, SocialAuthController.connectDirect);
router.post('/social/browser-login', requireAuth, SocialAuthController.browserLogin);
router.post('/social/save-browser-login', requireAuth, SocialAuthController.saveBrowserLogin);
router.post('/social/cancel-browser-login', requireAuth, SocialAuthController.cancelBrowserLogin);
router.post('/social/import-session', requireAuth, SocialAuthController.importSession);
router.get('/instagram', optionalAuth, SocialAuthController.initiateInstagram);
router.get('/instagram/callback', SocialAuthController.handleInstagramCallback);
router.get('/x', optionalAuth, SocialAuthController.initiateX);
router.get('/x/callback', SocialAuthController.handleXCallback);
router.get('/connections', requireAuth, SocialAuthController.getConnections);
router.delete('/connections/:provider', requireAuth, SocialAuthController.disconnect);

export default router;
