import dotenv from 'dotenv';
import path from 'path';

// Resolve environment variables from cwd, server/.env, or parent directories
dotenv.config();
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });
}
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, '../.env') });
}

const baseProfilePath = path.resolve(process.env.BROWSER_PROFILE_PATH || './profiles');

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/deepfake_detection',
  clientOrigin:
    process.env.CLIENT_ORIGIN ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173'),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars-long',
  sessionSecret: process.env.SESSION_SECRET || 'dev-session-secret-change-in-prod',
  email: {
    host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
    from: process.env.EMAIL_FROM || '"ShieldXL Cyber Intelligence" <alerts@shieldxl.cyber>',
    adminEmail: process.env.ADMIN_EMAIL || 'admin@shieldxl.cyber',
  },
  browser: {
    headless: process.env.BROWSER_HEADLESS !== 'false',
    profilePath: baseProfilePath,
    metaProfilePath: path.resolve(
      process.env.META_BROWSER_PROFILE_PATH || path.join(baseProfilePath, 'meta')
    ),
    grokProfilePath: path.resolve(
      process.env.GROK_BROWSER_PROFILE_PATH || path.join(baseProfilePath, 'grok')
    ),
    timeoutMs: parseInt(process.env.BROWSER_TIMEOUT_MS || '45000', 10),
    maxAnalysisDurationSeconds: parseInt(process.env.MAX_ANALYSIS_DURATION_SECONDS || '120', 10),
    concurrencyLimit: parseInt(process.env.CONCURRENT_ANALYSIS_LIMIT || '2', 10),
  },
  uploads: {
    maxSizeMb: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '50', 10),
    retentionDays: parseInt(process.env.MEDIA_RETENTION_DAYS || '7', 10),
    dir: path.resolve('./uploads'),
  },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  },
  oauth: {
    instagram: {
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri:
        process.env.INSTAGRAM_REDIRECT_URI ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/api/auth/instagram/callback`
          : 'http://localhost:5000/api/auth/instagram/callback'),
      scopes: ['user_profile', 'user_media'],
    },
    x: {
      clientId: process.env.X_CLIENT_ID || '',
      clientSecret: process.env.X_CLIENT_SECRET || '',
      redirectUri:
        process.env.X_REDIRECT_URI ||
        (process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/api/auth/x/callback`
          : 'http://localhost:5000/api/auth/x/callback'),
      scopes: ['tweet.read', 'users.read', 'offline.access'],
    },
  },
};
