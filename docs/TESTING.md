# Deepfake Detection System — Testing Guide & Verification Report

## 1. Test Suite Overview

The project uses **Vitest** for fast unit and integration testing, coupled with **Supertest** for end-to-end HTTP route assertions and Playwright for browser validation.

### Test Suites:
1. `server/src/services/platformDetectionService.test.ts` (15 Unit Tests)
   - Facebook post, reel, and video URLs
   - Instagram posts and reels
   - X.com and Twitter URLs
   - Query tracking parameter stripping (`fbclid`, `igshid`, `s`, `t`)
   - Deceptive phishing subdomains (`facebook.com.example.org`)
   - Embedded credentials rejection (`user:pass@host`)
   - SSRF private IP pattern blocking (`127.0.0.1`, `localhost`, `192.168.1.1`)
   - Protocol validation (`ftp:`, `file:`)
   - Root URL without post path rejection

2. `server/src/routes/api.test.ts` (18 Integration Tests)
   - `GET /api/health`: Health probe & dependency state
   - `POST /api/platform/detect`: Routing without AI execution
   - `POST /api/auth/register`: User and Reviewer registration with password hashing
   - `POST /api/auth/login`: Credential validation & JWT token generation
   - `GET /api/auth/me`: Authenticated profile fetch & 401 handling
   - `POST /api/analysis`: Job queue creation & status tracking
   - `GET /api/analysis/:id`: Analysis lookup and ownership enforcement
   - `GET /api/analysis`: List analyses with pagination
   - `POST /api/analysis/:id/manual-result`: Manual finding recording with explicit labeling
   - `GET /api/reviews`: Reviewer RBAC access enforcement (403 for USER, 200 for REVIEWER)
   - `POST /api/notifications/test`: Test in-app alert generation
   - `GET /api/notifications`: Notifications listing

---

## 2. Running Automated Tests

Run the full test suite with:

```bash
# In project root:
npm test

# Or in server workspace:
cd server
npm test
```

### Verified Test Outcome:
```text
 ✓ src/services/platformDetectionService.test.ts (15 tests)
 ✓ src/routes/api.test.ts (18 tests)

 Test Files  2 passed (2)
      Tests  33 passed (33)
```

---

## 3. Real Website Probe Scripts

To empirically verify live website behavior on Meta AI and Grok:

```bash
# Runs live Playwright headless probe against https://meta.ai and https://grok.com:
npm --workspace=server run investigate
```

Output is recorded in `docs/AI_WEBSITE_INVESTIGATION.json` and documented in `docs/AI_WEBSITE_INVESTIGATION.md`.
