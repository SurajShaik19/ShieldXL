# Deepfake Detection System — Architecture Overview

## 1. System Vision & Constraints
The **AI-Powered Deepfake Detection System MVP** is engineered to assess potential social media media manipulations by routing content directly to the primary native consumer AI websites:
- **Meta AI** (`https://www.meta.ai/`) for Facebook and Instagram posts.
- **Grok** (`https://grok.com/`) for X.com and Twitter posts.

In accordance with strict system requirements:
- **No developer or third-party deepfake APIs** are substituted for the primary workflow.
- Real Playwright browser automation is used with dedicated persistent browser profiles.
- Automated results are extracted directly from live AI sessions without fabrication.
- Ambiguities, inaccessible media, CAPTCHAs, or authentication requirements are surfaced transparently to the user, with clear manual fallback workflows.

---

## 2. High-Level Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                                 REACT CLIENT (Vite)                              |
|  - Landing Page     - URL Detection & Routing   - Live Job Status & Results       |
|  - Media Upload     - Reviewer Dashboard        - History & Notifications         |
+-----------------------------------------+-----------------------------------------+
                                          |
                                HTTP / REST API (Axios)
                                          |
+-----------------------------------------v-----------------------------------------+
|                                EXPRESS BACKEND (Node.js)                         |
|                                                                                   |
|  [ Middleware ]                                                                   |
|   - Helmet Security Headers, CORS, Rate Limiter                                   |
|   - JWT Authentication & Role-Based Access Control (USER, REVIEWER, ADMIN)         |
|   - Strict URL Sanitization & SSRF Protection                                     |
|                                                                                   |
|  [ Services & Controllers ]                                                       |
|   - PlatformDetectionService: Host allowlisting, normalization, platform binding  |
|   - AnalysisOrchestrator: Job state machine & async execution queue               |
|   - BrowserSessionManager: Playwright browser pool & profile lifecycle            |
|   - MetaAiBrowserService / GrokBrowserService: Real web interactions              |
|   - NotificationService: SMTP/Ethereal email dispatch & In-app alerts             |
|                                                                                   |
|  [ Persistence Layer ]                                                            |
|   - MongoDB Atlas / Mongoose (User, Analysis, Notification, Review)               |
+-----------------------------------------------------------------------------------+
```

---

## 3. Component Details

### A. Platform Detection Service (`server/src/services/platformDetectionService.ts`)
- **Protocol Enforcer:** Allows only `http:` and `https:`, normalizing to `https:`.
- **SSRF Prevention:** Strips embedded credentials (`user:pass@host`) and denies all private IPv4/IPv6 ranges (`127.0.0.1`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `localhost`).
- **Exact Hostname Allowlisting:**
  - `facebook.com`, `www.facebook.com`, `m.facebook.com`, `web.facebook.com`, `fb.watch`, `instagram.com`, `www.instagram.com` -> **`META`** (`META_AI`)
  - `x.com`, `www.x.com`, `twitter.com`, `www.twitter.com`, `mobile.twitter.com` -> **`X`** (`GROK`)
  - Any subdomain trickery (e.g. `facebook.com.attacker.com`) is rejected immediately as `UNSUPPORTED`.
- **Query Stripping:** Strips social tracking parameters (`fbclid`, `igshid`, `s`, `t`, `utm_*`).

### B. Analysis Orchestrator & Job Lifecycle (`server/src/services/analysisOrchestrator.ts`)
Executes an asynchronous state machine:
```
PENDING
  -> VALIDATING_URL
  -> DETECTING_PLATFORM
  -> CHECKING_SESSION
  -> SUBMITTING_URL
  -> WAITING_FOR_AI_RESPONSE
  -> ANALYZING (Response Interpretation)
  -> COMPLETED | INCONCLUSIVE | UNABLE_TO_ANALYZE | FAILED
```
Long-running browser automation is completely detached from the incoming HTTP request. Clients poll via `GET /api/analysis/:id`.

### C. Deepfake Classification & Interpretation Layer
AI natural language outputs are evaluated without inventing numerical percentage scores:
- **`POTENTIAL_MANIPULATION`**: Explicit detection of generative AI artifacts, deepfake indicators, face-swapping, synthetic voices, diffusion inconsistencies.
- **`NO_STRONG_SIGNALS_DETECTED`**: AI observed no apparent manipulation signs, genuine footage indicators.
- **`INCONCLUSIVE`**: AI indicates ambiguity, insufficient resolution, or inconclusive evidence.
- **`UNABLE_TO_ANALYZE`**: Post inaccessible, login-gated on source platform, or AI refused URL lookup.
- **`ANALYSIS_FAILED`**: Browser timeout, network error, or unexpected session disruption.
