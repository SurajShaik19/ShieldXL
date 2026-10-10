# Deepfake Detection System — Security Architecture & Threat Model

## 1. Threat Mitigation Summary

| Threat Vector | Mitigation Strategy | Implemented Component |
|---|---|---|
| **SSRF (Server-Side Request Forgery)** | Strict URL parsing, private IP pattern regexes, exact domain allowlisting | `PlatformDetectionService.ts` |
| **Credential Phishing in URLs** | Explicit rejection of URLs containing embedded userinfo (`username:password@`) | `PlatformDetectionService.ts` |
| **Path Traversal in Uploads** | Auto-generated random UUID filenames; storage in dedicated non-public directory | `upload.ts` (Multer) |
| **Credential Harvesting in Browser Profiles** | Isolated disk directories (`server/profiles/`), strict `.gitignore`, never served via Express routes | `browserSessionManager.ts`, `.gitignore` |
| **Brute Force & DoS Attacks** | Express rate limiters for auth (20 req / 15 min) and API (100 req / 15 min) | `rateLimiter.ts` |
| **Cross-Origin & Injection Attacks** | Helmet HTTP headers, CORS origin allowlisting, JSON payload size restrictions (10MB) | `app.ts` |
| **Unauthorized Case Access** | Ownership check on analyses; Role-Based Access Control (`USER`, `REVIEWER`, `ADMIN`) | `auth.ts`, `analysisController.ts`, `reviewController.ts` |

---

## 2. SSRF & URL Validation Architecture
Before any URL is considered for platform detection or browser dispatch, it undergoes rigorous inspection:
1. **Protocol Check:** Only `http:` and `https:` are permitted; all URLs are normalized to `https:`.
2. **Userinfo Stripping/Denial:** Any URL containing `parsed.username` or `parsed.password` is rejected with a `400 Security Violation`.
3. **Private IP & Loopback Filter:** Matches against loopback and RFC 1918 private subnets:
   - `localhost`, `127.0.0.0/8`, `10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`, `::1`, `fc00::`, `fe80::`
4. **Exact Hostname Allowlist:**
   - Meta: `facebook.com`, `www.facebook.com`, `m.facebook.com`, `web.facebook.com`, `fb.watch`, `instagram.com`, `www.instagram.com`
   - X: `x.com`, `www.x.com`, `twitter.com`, `www.twitter.com`, `mobile.twitter.com`
   - Subdomain deception (e.g. `facebook.com.attacker.com`) is rejected.

---

## 3. Browser Session & Data Privacy
- **Persistent Profiles:** Playwright profiles store cookies and session state in `server/profiles/`.
- **Exclusion:** The directory `server/profiles/` is strictly registered in `.gitignore`.
- **Zero Token Leakage:** Authentication cookies and browser tokens are never returned over REST APIs or displayed to the client frontend.
- **Controlled Automation:** Automation does not attempt to brute force CAPTCHAs or bypass multi-factor authentication. If a session is challenged or logged out, the system halts and notifies the authorized user.
