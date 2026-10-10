# Deepfake Detection System — REST API Specification

Base URL: `http://localhost:5000/api`

---

## 1. Authentication Endpoints

### Register User
- **Method:** `POST`
- **Route:** `/api/auth/register`
- **Body:**
```json
{
  "name": "Analyst Jane",
  "email": "jane@defense.agency",
  "password": "Password123!",
  "role": "USER"
}
```
- **Response (201):**
```json
{
  "message": "Account registered successfully.",
  "token": "eyJhbGciOi...",
  "user": {
    "id": "67...",
    "name": "Analyst Jane",
    "email": "jane@defense.agency",
    "role": "USER"
  }
}
```

### Login
- **Method:** `POST`
- **Route:** `/api/auth/login`
- **Body:**
```json
{
  "email": "jane@defense.agency",
  "password": "Password123!"
}
```
- **Response (200):** Sets HTTP-only cookie `token` and returns JSON payload with JWT.

### Get Current User
- **Method:** `GET`
- **Route:** `/api/auth/me`
- **Headers:** `Authorization: Bearer <token>`
- **Response (200):** `{ "user": { ... } }`

---

## 2. Platform Detection Endpoint

### Fast URL Platform Detector
- **Method:** `POST`
- **Route:** `/api/platform/detect`
- **Auth:** Not required (Fast pre-check)
- **Body:**
```json
{
  "url": "https://www.facebook.com/reel/123456789"
}
```
- **Response (200):**
```json
{
  "platform": "META",
  "normalizedUrl": "https://www.facebook.com/reel/123456789",
  "hostname": "facebook.com",
  "isValid": true,
  "isSupported": true,
  "selectedAiWebsite": "META_AI",
  "mediaTypeHint": "VIDEO",
  "sessionStatus": "REQUIRES_SETUP"
}
```
*Note: This endpoint strictly identifies and routes the platform without initiating AI automation.*

---

## 3. Analysis Endpoints

### Submit URL for Analysis
- **Method:** `POST`
- **Route:** `/api/analysis`
- **Auth:** Required
- **Body:**
```json
{
  "url": "https://x.com/username/status/1888888888"
}
```
- **Response (202 Accepted):**
```json
{
  "message": "Analysis job queued successfully.",
  "jobId": "67...",
  "status": "PENDING",
  "platform": "X",
  "aiWebsite": "GROK"
}
```

### Upload Media Fallback
- **Method:** `POST`
- **Route:** `/api/analysis/upload`
- **Auth:** Required
- **Content-Type:** `multipart/form-data`
- **Field:** `media` (File: image/jpeg, image/png, image/webp, video/mp4, video/webm, max 50MB)
- **Response (202 Accepted):**
```json
{
  "message": "Media uploaded successfully. Analysis job initialized.",
  "jobId": "67...",
  "filename": "sample_video.mp4",
  "mediaType": "VIDEO",
  "status": "PENDING"
}
```

### Get Analysis Job Status & Result
- **Method:** `GET`
- **Route:** `/api/analysis/:id`
- **Auth:** Required (Owner, Reviewer, or Admin)
- **Response (200):**
```json
{
  "analysis": {
    "_id": "67...",
    "platform": "X",
    "aiWebsite": "GROK",
    "jobStatus": "COMPLETED",
    "resultCategory": "POTENTIAL_MANIPULATION",
    "actualAiResponse": "Model text extracted from Grok...",
    "observations": [
      "Artificial face border distortion",
      "Lighting inconsistencies between subject and background"
    ],
    "limitations": [
      "Advisory assessment based on visible patterns."
    ],
    "browserWorkflowStatus": "COMPLETED",
    "createdAt": "2026-10-10T..."
  }
}
```

### List Analyses
- **Method:** `GET`
- **Route:** `/api/analysis?page=1&limit=10&platform=META&resultCategory=POTENTIAL_MANIPULATION&search=...`
- **Auth:** Required

### Retry Analysis
- **Method:** `POST`
- **Route:** `/api/analysis/:id/retry`
- **Auth:** Required

### Record Manual Result
- **Method:** `POST`
- **Route:** `/api/analysis/:id/manual-result`
- **Auth:** Required
- **Body:**
```json
{
  "manualResponseText": "Transcribed AI output from user session...",
  "aiWebsiteUsed": "META_AI",
  "notes": "Verified by analyst directly"
}
```

---

## 4. AI Session Readiness

### Get AI Engine Readiness
- **Method:** `GET`
- **Route:** `/api/ai/status`
- **Response (200):**
```json
{
  "services": {
    "metaAi": {
      "service": "META_AI",
      "isAvailable": true,
      "isAuthenticated": false,
      "requiresManualSetup": true,
      "statusMessage": "Meta AI requires interactive login. Run `npm run auth:meta`"
    },
    "grok": {
      "service": "GROK",
      "isAvailable": true,
      "isAuthenticated": false,
      "requiresManualSetup": true,
      "statusMessage": "Grok requires interactive login. Run `npm run auth:grok`"
    }
  },
  "notifications": {
    "emailConfigured": false,
    "host": "smtp.ethereal.email"
  }
}
```

---

## 5. Reviewer Endpoints

### List Pending Review Queue
- **Method:** `GET`
- **Route:** `/api/reviews`
- **Auth:** Required (Role: `REVIEWER` or `ADMIN`)

### Record Reviewer Decision
- **Method:** `POST`
- **Route:** `/api/reviews/:id/decision`
- **Auth:** Required (Role: `REVIEWER` or `ADMIN`)
- **Body:**
```json
{
  "decision": "CONFIRMED_MANIPULATION",
  "notes": "Detailed forensic notes verifying facial anomalies",
  "escalationStatus": "NONE"
}
```

---

## 6. System Health

### Health Probe
- **Method:** `GET`
- **Route:** `/api/health`
- **Response (200):**
```json
{
  "status": "HEALTHY",
  "database": { "connected": true, "state": "CONNECTED" },
  "services": { "metaAiSupported": true, "grokSupported": true }
}
```
