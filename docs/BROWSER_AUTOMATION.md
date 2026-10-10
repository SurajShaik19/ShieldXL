# Browser Automation & AI Session Engineering

## 1. Overview
The Deepfake Detection System MVP automates browser interactions with **Meta AI** (`https://www.meta.ai/`) and **Grok** (`https://grok.com/`). Unlike API integrations, real website automation requires persistent browser context handling, authentication checks, dynamic DOM observation, anti-bot resilience, and deterministic extraction.

---

## 2. Authentication Strategy & Setup
Consumer AI services such as Meta AI and Grok protect their core features or query limits with account authentication and occasional Cloudflare/reCAPTCHA challenges. 

### Why Headless Credential Injection is Prohibited:
- Storing plain-text credentials in config or source code creates severe credential leaks.
- Programmatic credential filling frequently triggers MFA, mobile push authentications, or security account locks.

### The Authorized Admin Setup Flow:
To establish an authorized session:
1. Run the interactive session initialization command:
   ```bash
   # For Meta AI (Facebook/Instagram analysis)
   npm run auth:meta

   # For Grok AI (X/Twitter analysis)
   npm run auth:grok
   ```
2. A headed Chromium browser window opens using a persistent user data directory (`server/profiles/meta` or `server/profiles/grok`).
3. The human administrator or authorized analyst completes login (and any MFA / CAPTCHA challenge).
4. Once logged in, the browser profile stores session cookies, local storage, and service worker states inside the dedicated isolated profile directory on disk (which is strictly `.gitignore`d).
5. The headless worker subsequently loads this persistent context to execute subsequent automated analyses.

---

## 3. Playwright Session Lifecycle
`server/src/services/browserSessionManager.ts` manages:
- **Profile Isolation:** Dedicated profile directories per AI engine (`profiles/meta` and `profiles/grok`).
- **Concurrency Locks:** Prevents race conditions and multiple conflicting queries on the same AI conversation tab.
- **Session Readiness Probes:** Checks if the chat input element is visible or if an authentication prompt is blocking the page.
- **Graceful Timeouts:** All page operations carry bounded timeouts (`45s`) to prevent zombie browser processes.

---

## 4. Manual Fallback Flow
If an AI website:
1. Imposes an unexpected CAPTCHA or Cloudflare challenge,
2. Informs the user that the external social media URL cannot be scraped due to privacy/login walls on Instagram or X,
3. Refuses URL fetching:

The system flags the analysis with status `UNABLE_TO_ANALYZE` or `WAITING_FOR_USER`, generates a detailed limitation explanation, and provides the user with:
- A secure **Media Upload interface** to test the extracted file directly.
- A **Manual Result entry form** where the user can submit the AI's direct response if they performed the query in their own browser tab. All manual entries are stamped clearly as user-provided to preserve integrity.
