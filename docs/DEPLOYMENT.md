# Deepfake Detection System — Deployment Guide

## 1. Hosting Architecture & Prerequisites

### Frontend:
- **Platform:** Vercel, Netlify, Cloudflare Pages, or AWS S3 + CloudFront.
- **Build Command:** `npm run build`
- **Output Directory:** `client/dist`
- **Environment Variables:**
  - `VITE_API_BASE_URL`: URL to backend API (e.g. `https://api.deepfakedetect.agency/api` or `/api` if using reverse proxy).

### Backend:
- **Platform:** Long-running container or virtual server (Docker, Railway, Render, Fly.io, AWS EC2, DigitalOcean Droplet).
- **CRITICAL CONSTRAINT:** **Do not deploy backend as standard stateless serverless functions (e.g. Vercel Serverless or standard AWS Lambda)**. Playwright requires persistent disk storage (`server/profiles/`) to preserve authenticated browser sessions across user requests, and needs native OS Chromium libraries.
- **Node.js:** v20.x or v22.x LTS.
- **Playwright Dependencies:** Ensure browser dependencies are installed via `npx playwright install-deps chromium`.

### Database:
- **Platform:** MongoDB Atlas (M0 Free Tier or Dedicated Cluster).
- Configure IP Access List in MongoDB Atlas to permit your backend server IP.

---

## 2. Environment Variables Configuration

Copy `server/.env.example` to `server/.env` and update:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/deepfake_detection?retryWrites=true&w=majority
CLIENT_ORIGIN=https://deepfakedetect.agency
JWT_SECRET=your-production-secret-min-32-characters-long
SESSION_SECRET=your-production-session-encryption-key

# Email Transport (SMTP)
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=postmaster@deepfakedetect.agency
EMAIL_PASSWORD=your-smtp-password
EMAIL_FROM="Deepfake Alert" <alerts@deepfakedetect.agency>
ADMIN_EMAIL=security@deepfakedetect.agency

# Browser Automation
BROWSER_HEADLESS=true
BROWSER_PROFILE_PATH=./profiles
BROWSER_TIMEOUT_MS=45000
MAX_ANALYSIS_DURATION_SECONDS=120
CONCURRENT_ANALYSIS_LIMIT=2

# Security & Uploads
MAX_UPLOAD_SIZE_MB=50
MEDIA_RETENTION_DAYS=7
```

---

## 3. Initializing AI Engine Sessions on Server Host

On the host machine running the backend:

1. Connect via terminal with graphical display access (or X11 forwarding / VNC):
   ```bash
   # Authorize Meta AI
   npm run auth:meta

   # Authorize Grok AI
   npm run auth:grok
   ```
2. Complete authentication in the opened browser window.
3. The session profiles will be stored securely on the host in `server/profiles/meta` and `server/profiles/grok`.
4. Launch the backend service in headless mode:
   ```bash
   npm --workspace=server run start
   ```
