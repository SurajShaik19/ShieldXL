# AI-Powered Deepfake Detection System MVP

A full-stack cybersecurity application built on the **MERN** stack that evaluates social media URLs and suspicious media by routing directly to consumer AI web interfaces:
- **Meta AI** (`https://www.meta.ai/`) for Facebook & Instagram posts
- **Grok** (`https://grok.com/`) for X.com & Twitter posts

The system utilizes **authorized Playwright browser automation** with persistent profiles, preserves raw model observations without fabricating confidence percentages, implements strict SSRF and platform detection filters, and delivers in-app and email alerts.

---

## 🚀 Key Features

- **Strict Platform Detection:** Regex and allowlist verification for `facebook.com`, `fb.watch`, `instagram.com`, `x.com`, and `twitter.com`. Strips tracking query parameters (`fbclid`, `igshid`, `s`, `t`) and repels deceptive domains and SSRF vectors.
- **Dedicated AI Routing:** Facebook and Instagram links automatically route to Meta AI; X and Twitter links route to Grok.
- **Genuine AI Automation:** Leverages real Playwright Chromium sessions with isolated persistent browser contexts.
- **No Fabricated Confidence Scores:** Model responses are interpreted transparently into calibrated categories (`POTENTIAL_MANIPULATION`, `NO_STRONG_SIGNALS_DETECTED`, `INCONCLUSIVE`, `UNABLE_TO_ANALYZE`, `ANALYSIS_FAILED`).
- **Media Upload Fallback:** Secure image and video upload interface with size and MIME validation when social posts are restricted.
- **Manual Analyst Handoff:** Dedicated workflow to record transcribed model observations when an external session is used.
- **Reviewer Moderation Queue:** Role-based portal (`USER`, `REVIEWER`, `ADMIN`) to inspect flagged cases and record human reviewer verdicts.
- **Email & In-App Alerts:** Dispatches notifications upon job completion, review escalation, or authentication requirement.

---

## 🛠️ Technology Stack

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, React Router, Axios, Lucide React.
- **Backend:** Node.js, Express.js, TypeScript, Mongoose, Zod, Helmet, Multer, Nodemailer, Pino.
- **Automation:** Playwright with Chromium persistent profiles.
- **Database:** MongoDB Atlas (with automatic in-memory fallback for seamless local execution).
- **Testing:** Vitest & Supertest.

---

## 📦 Project Structure

```text
deepfake-detection/
├── client/                     # React Vite TypeScript frontend
│   ├── src/
│   │   ├── components/         # Navbar, Badges, Status Card
│   │   ├── context/            # AuthContext
│   │   ├── pages/              # Landing, Dashboard, Results, History, Alerts, Settings, Reviewer
│   │   ├── services/           # Axios API client
│   │   └── types/              # TypeScript definitions
│   └── index.html
├── server/                     # Express Node TypeScript backend
│   ├── profiles/               # Isolated Playwright profiles (meta/ and grok/) [gitignore]
│   ├── src/
│   │   ├── config/             # Environment, Logger, Database connection
│   │   ├── controllers/        # Auth, Platform, Analysis, AI Status, Notifications, Review
│   │   ├── middleware/         # JWT Auth, Role Guard, Rate Limiter, Error Handler, Upload
│   │   ├── models/             # User, Analysis, Notification, Review (Mongoose)
│   │   ├── routes/             # REST route definitions
│   │   ├── scripts/            # authSetup.ts, investigateWebsites.ts
│   │   ├── services/
│   │   │   ├── ai/             # metaAiBrowserService, grokBrowserService, responseInterpreter
│   │   │   ├── notifications/  # emailService
│   │   │   ├── analysisOrchestrator.ts
│   │   │   ├── browserSessionManager.ts
│   │   │   └── platformDetectionService.ts
│   └── src/server.ts
├── docs/                       # Architecture, API, Security, Testing, Deployment, AI Investigation
├── package.json                # Root monorepo workspace package.json
└── README.md
```

---

## 💻 Local Installation & Setup (Windows Terminal)

### 1. Clone & Install Dependencies
Open PowerShell or CMD in the project directory:

```powershell
# Install all workspace dependencies
npm install

# Install Playwright Chromium browser binary
npx playwright install chromium
```

### 2. Environment Configuration
Create local `.env` files from examples:

```powershell
# Server environment
Copy-Item server\.env.example server\.env

# Client environment
Copy-Item client\.env.example client\.env
```

### 3. Establish Authorized AI Sessions (Interactive)
Because Meta AI and Grok require signed-in accounts to prevent bot challenges:

```powershell
# For Meta AI (Facebook & Instagram analysis):
npm run auth:meta

# For Grok (X.com & Twitter analysis):
npm run auth:grok
```
*A headed Chromium window will appear. Complete sign-in, then press [ENTER] in your terminal to save cookies and session tokens to disk.*

### 4. Run Automated Tests
```powershell
npm test
```
*Executes all 33 unit and integration tests across URL detection, security filters, and REST APIs.*

### 5. Start Application Concurrently
```powershell
npm run dev
```

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **Health Check:** http://localhost:5000/api/health

---

## 🔒 Security Best Practices

- Browser cookies and session files in `server/profiles/` are strictly excluded from source control via `.gitignore` and never exposed over REST endpoints.
- Strict SSRF filtering blocks private and loopback IP addresses (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `192.168.0.0/16`).
- Deceptive phishing subdomains (`facebook.com.malicious.net`) are immediately rejected.
- Passwords are encrypted with bcrypt with salt cost 10.
"# ShieldXL" 
