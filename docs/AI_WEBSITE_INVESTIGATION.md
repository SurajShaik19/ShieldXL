# AI Website Investigation Report — Meta AI & Grok

**Date of Investigation:** October 2026  
**Tools Used:** Playwright Chromium headless engine & live network probes  
**Target URLs:**  
- Meta AI: `https://www.meta.ai/`  
- Grok: `https://grok.com/`

---

## 1. Executive Summary

Empirical testing was conducted against both consumer AI web platforms without utilizing developer APIs or third-party wrappers. The real-world findings demonstrate:

1. **Mandatory Authentication:**
   - Both **Meta AI** and **Grok** require user sign-in to complete conversational AI queries.
   - Unauthenticated access to Meta AI displays a prompt banner: *"Sign in to get started. Log in or sign up to ask Meta AI anything"*.
   - Unauthenticated prompt submission on Grok immediately halts generation with a modal: *"Sign up to continue seamlessly with Grok’s full power"*.

2. **Access Control & Anti-Bot Measures:**
   - Meta AI enforces a `403 Client Challenge` header against unauthenticated programmatic fetches.
   - Grok routes through Cloudflare edge protection (`__cf_bm`, `cf-cache-status: DYNAMIC`).
   - Neither service permits raw unauthenticated API calls or unauthenticated automated guest queries.

3. **Engineering Solution:**
   - **Persistent Browser Contexts:** Playwright is configured to run with dedicated user data profiles (`server/profiles/meta` and `server/profiles/grok`).
   - **Interactive Admin Setup Commands:** Admins or analysts initialize sessions interactively via `npm run auth:meta` and `npm run auth:grok`, resolving any MFA/CAPTCHA directly in a headed browser window once.
   - **Automated Execution:** Once the persistent profile stores authentication cookies and local storage tokens, subsequent automated analyses leverage the active session.
   - **Graceful Unauthenticated Fallback:** If a session is unauthenticated, expired, or blocked, the backend detects this state, flags the job status as `WAITING_FOR_USER` or `UNABLE_TO_ANALYZE`, generates an alert, and presents a structured manual entry / media upload workflow to the user.

---

## 2. Technical Findings Detail

### A. Meta AI (`https://www.meta.ai/`)
| Metric | Verified Observation |
|---|---|
| HTTP Status | 403 on raw curl, 200/DOM loaded in real browser |
| Input Element | Input element with placeholder `Ask Meta AI...` |
| Auth Prompt | Modal overlays input: `Log in or sign up to ask Meta AI anything` |
| Social Link Access | Meta AI can index and review public Meta properties (FB/IG) when authenticated |
| Image/Media Upload | Supported via attachment button when signed in |
| Video Upload | Limited / prompt-directed; original post link preferred |

### B. Grok (`https://grok.com/`)
| Metric | Verified Observation |
|---|---|
| HTTP Status | 200 with Cloudflare headers |
| Input Element | `textarea` with placeholder `Ask Grok anything` |
| Auth Prompt | Triggers `Sign up to continue seamlessly with Grok's full power` upon submitting query |
| Social Link Access | Grok natively queries X.com (Twitter) real-time data when authenticated |
| Image/Media Upload | Supported via file picker when authenticated |
