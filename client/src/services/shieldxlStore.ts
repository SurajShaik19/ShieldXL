import { AnalysisItem, PlatformDetection, NotificationItem } from '../types';

export const PLATFORM_LOGIN_URLS = {
  INSTAGRAM: 'https://www.instagram.com/accounts/login/',
  X: 'https://x.com/i/flow/login',
  META_AI: 'https://www.meta.ai/',
  GROK: 'https://grok.com/',
};

export const openPlatformLogin = (platform: 'INSTAGRAM' | 'X' | 'META_AI' | 'GROK'): void => {
  const url = PLATFORM_LOGIN_URLS[platform];
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/**
 * Fast client-side URL detection fallback so flow is never blocked
 */
export const detectPlatformLocal = (inputUrl: string): PlatformDetection => {
  const trimmed = (inputUrl || '').trim();
  let hostname = '';
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    hostname = parsed.hostname.toLowerCase();
  } catch {
    hostname = trimmed.toLowerCase();
  }

  const isMeta =
    hostname.includes('facebook.com') ||
    hostname.includes('fb.watch') ||
    hostname.includes('fb.com') ||
    hostname.includes('instagram.com') ||
    hostname.includes('instagr.am');

  const isX =
    hostname.includes('x.com') ||
    hostname.includes('twitter.com') ||
    hostname.includes('t.co');

  if (isMeta) {
    return {
      platform: 'META',
      normalizedUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      hostname,
      isValid: true,
      isSupported: true,
      selectedAiWebsite: 'META_AI',
      mediaTypeHint: hostname.includes('instagram.com') ? 'VIDEO' : 'POST',
      sessionStatus: 'AUTHENTICATED',
    };
  }

  if (isX) {
    return {
      platform: 'X',
      normalizedUrl: trimmed.startsWith('http') ? trimmed : `https://${trimmed}`,
      hostname,
      isValid: true,
      isSupported: true,
      selectedAiWebsite: 'GROK',
      mediaTypeHint: 'POST',
      sessionStatus: 'AUTHENTICATED',
    };
  }

  return {
    platform: 'UNSUPPORTED',
    normalizedUrl: trimmed,
    hostname,
    isValid: trimmed.length > 5,
    isSupported: false,
    errorMessage: 'ShieldXL currently supports Facebook, Instagram, and X.com / Twitter media URLs.',
  };
};

// Seed realistic sample analyses so the application looks rich immediately
const SEED_JOBS: AnalysisItem[] = [
  {
    _id: 'sxl_demo_meta_01',
    owner: {
      id: 'analyst_01',
      name: 'Analyst Demo (ShieldXL)',
      email: 'analyst@shieldxl.cyber',
      role: 'ADMIN',
    },
    originalUrl: 'https://www.instagram.com/reel/C8x9Y2mPvX1/',
    normalizedUrl: 'https://www.instagram.com/reel/C8x9Y2mPvX1/',
    platform: 'META',
    aiWebsite: 'META_AI',
    inputSourceType: 'ORIGINAL_POST_URL',
    mediaType: 'VIDEO',
    jobStatus: 'COMPLETED',
    resultCategory: 'POTENTIAL_MANIPULATION',
    isManipulatedProbability: 0.942,
    observations: [
      'Facial boundary blending artifacts detected along jawline and ear margins (SSIM delta: 0.18)',
      'Phoneme-viseme desynchronization: Lip movements lag audio speech track by ~140ms in syllable transitions',
      'High-frequency spatial grid artifacts typical of latent diffusion / GAN video reenactment models',
      'Unnatural pupil reflections inconsistent with key light source angle observed in background environment',
    ],
    limitations: [
      'Social media H.264 compression re-encoding reduces high-frequency texture analysis fidelity',
      'Short duration clip (14s) provides limited temporal blink cadence sample',
    ],
    actualAiResponse: `### ShieldXL Forensic Analysis Summary (via Meta AI Engine)

**Platform Verification:** Instagram Reel Post  
**Model Identified:** Latent Diffusion Face Reenactment (estimated Wan2.1 / LivePortrait pipeline)  
**Overall Verdict:** High Probability of Synthetic Video Manipulation (94.2% Confidence)

**Key Forensic Observations:**
1. **Facial Boundary Integrity:** Significant edge feathering and blending blur identified where the synthetic face mask intersects with the natural neck and hairline.
2. **Audio-Visual Latency:** Distinct acoustic mismatch during plosive consonants ("p", "b") where lip closure does not correspond with acoustic burst peaks.
3. **Lighting & Reflection Physics:** Specular corneal reflections do not match the secondary ambient lamp located on the subject's left.

**Analyst Recommendation:** Flag post for priority review and content labeling under synthetic media guidelines.`,
    browserWorkflowStatus: 'Automated Meta AI browser workflow completed. Forensic analysis extracted successfully.',
    analysisTimestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    requiresReview: true,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'sxl_demo_grok_02',
    owner: {
      id: 'analyst_01',
      name: 'Analyst Demo (ShieldXL)',
      email: 'analyst@shieldxl.cyber',
      role: 'ADMIN',
    },
    originalUrl: 'https://x.com/breakingnews/status/188492019481920192',
    normalizedUrl: 'https://x.com/breakingnews/status/188492019481920192',
    platform: 'X',
    aiWebsite: 'GROK',
    inputSourceType: 'ORIGINAL_POST_URL',
    mediaType: 'VIDEO',
    jobStatus: 'COMPLETED',
    resultCategory: 'POTENTIAL_MANIPULATION',
    isManipulatedProbability: 0.897,
    observations: [
      'Temporal frame warping and structural micro-jitter identified between frames 112-245',
      'Synthetic voice cloning cues: pitch contour displays robotic flattening during sentence termination',
      'Inconsistent earlobe geometry during rapid horizontal head rotation',
      'Background text in signage exhibits AI diffusion hallucination and fluctuating characters',
    ],
    limitations: [
      'Re-uploaded video resolution capped at 720p',
      'Absence of camera EXIF metadata in social post payload',
    ],
    actualAiResponse: `### ShieldXL Forensic Analysis Summary (via Grok AI Engine)

**Platform Verification:** X.com (Twitter) Video Post  
**Model Identified:** Synthetic Voice Cloning + Diffusion Video Synthesis  
**Overall Verdict:** Manipulated / Artificial Media Detected (89.7% Confidence)

**Forensic Breakdown:**
1. **Voice Frequency Spectral Analysis:** High-frequency cutoffs at 16kHz and unnatural harmonics indicate neural text-to-speech voice conversion.
2. **Dynamic Motion Warping:** When the subject turns 45 degrees, the temporal coherence of the ear structure disintegrates, displaying classic generative inpainting artifacts.
3. **Background Inconsistency:** Letters on the store sign in the background morph subtly between frames, a hallmark of generative video models.

**Analyst Recommendation:** Mark as Synthetic Media and attach forensic disclaimer report.`,
    browserWorkflowStatus: 'Automated Grok browser workflow completed. Analysis data persisted.',
    analysisTimestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    requiresReview: true,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    _id: 'sxl_demo_meta_03',
    owner: {
      id: 'analyst_01',
      name: 'Analyst Demo (ShieldXL)',
      email: 'analyst@shieldxl.cyber',
      role: 'ADMIN',
    },
    originalUrl: 'https://www.facebook.com/watch/?v=928371928471928',
    normalizedUrl: 'https://www.facebook.com/watch/?v=928371928471928',
    platform: 'META',
    aiWebsite: 'META_AI',
    inputSourceType: 'ORIGINAL_POST_URL',
    mediaType: 'VIDEO',
    jobStatus: 'COMPLETED',
    resultCategory: 'NO_STRONG_SIGNALS_DETECTED',
    isManipulatedProbability: 0.065,
    observations: [
      'Natural optical motion blur consistent with rolling shutter exposure settings',
      'Sub-surface scattering in facial skin tones accurately tracks environmental lighting shifts',
      'Consistent organic eye blink rate of ~17 blinks per minute across entire duration',
      'Audio spectrum demonstrates natural room acoustics, natural reverberation, and uncompressed vocal dynamics',
    ],
    limitations: [
      'Standard social compression applied',
    ],
    actualAiResponse: `### ShieldXL Forensic Analysis Summary (via Meta AI Engine)

**Platform Verification:** Facebook Video Post  
**Overall Verdict:** Genuine Media / No Strong Signals of Manipulation Detected (93.5% Authenticity)

**Observations:**
- Skin texture reveals micro-pores and fine hairs with continuous physical realism.
- Natural camera shake and lens breathing match authentic optical hardware.
- No boundary seams or diffusion warping detected across all 420 frames inspected.

**Analyst Recommendation:** Verified authentic content. No action required.`,
    browserWorkflowStatus: 'Automated Meta AI workflow completed. Media verified as authentic.',
    analysisTimestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    requiresReview: false,
    createdAt: new Date(Date.now() - 3600000 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
];

const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    _id: 'notif_01',
    recipient: 'analyst_01',
    type: 'HIGH_RISK_MANIPULATION_DETECTED',
    message: 'ShieldXL Alert: Instagram Reel (C8x9Y2mPvX1) analyzed with 94.2% Deepfake probability.',
    channel: 'IN_APP',
    deliveryStatus: 'SENT',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    _id: 'notif_02',
    recipient: 'analyst_01',
    type: 'ANALYSIS_COMPLETED',
    message: 'ShieldXL Alert: X.com Post video analysis completed via Grok AI (89.7% Synthetic Media).',
    channel: 'IN_APP',
    deliveryStatus: 'SENT',
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
];

/**
 * Get all stored jobs from localStorage merged with seeds
 */
export const getStoredJobs = (): AnalysisItem[] => {
  try {
    const raw = localStorage.getItem('shieldxl_jobs');
    if (raw) {
      const parsed: AnalysisItem[] = JSON.parse(raw);
      // Merge unique
      const ids = new Set(parsed.map((j) => j._id));
      const merged = [...parsed];
      for (const seed of SEED_JOBS) {
        if (!ids.has(seed._id)) {
          merged.push(seed);
        }
      }
      return merged;
    }
  } catch {}
  return [...SEED_JOBS];
};

/**
 * Save or update a job in localStorage
 */
export const saveStoredJob = (job: AnalysisItem): void => {
  const current = getStoredJobs();
  const index = current.findIndex((j) => j._id === job._id);
  if (index >= 0) {
    current[index] = job;
  } else {
    current.unshift(job);
  }
  localStorage.setItem('shieldxl_jobs', JSON.stringify(current));
};

/**
 * Create a new mock analysis job immediately
 */
export const createMockAnalysis = (input: string, isUpload?: boolean): AnalysisItem => {
  const detection = isUpload
    ? {
        platform: 'META' as const,
        normalizedUrl: `upload://${input}`,
        selectedAiWebsite: 'META_AI' as const,
      }
    : detectPlatformLocal(input);

  const jobId = `sxl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newJob: AnalysisItem = {
    _id: jobId,
    owner: {
      id: 'analyst_01',
      name: 'Analyst Demo (ShieldXL)',
      email: 'analyst@shieldxl.cyber',
      role: 'ADMIN',
    },
    originalUrl: input,
    normalizedUrl: detection.normalizedUrl,
    platform: detection.platform === 'UNSUPPORTED' ? 'META' : detection.platform,
    aiWebsite: detection.selectedAiWebsite || 'META_AI',
    inputSourceType: isUpload ? 'USER_UPLOAD' : 'ORIGINAL_POST_URL',
    uploadedFileName: isUpload ? input : undefined,
    mediaType: 'VIDEO',
    jobStatus: 'PENDING',
    observations: [],
    limitations: [],
    browserWorkflowStatus: 'Job initialized. Preparing forensic browser inspection...',
    requiresReview: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  saveStoredJob(newJob);
  return newJob;
};

/**
 * Simulates realistic analysis progress and emits completed high-detail forensic data
 */
export const simulateJobProgress = (
  jobId: string,
  onUpdate: (updatedJob: AnalysisItem) => void,
  onComplete?: (completedJob: AnalysisItem) => void
): (() => void) => {
  let isCancelled = false;
  const current = getStoredJobs().find((j) => j._id === jobId) || createMockAnalysis('https://instagram.com/reel/sample');

  const steps = [
    {
      status: 'VALIDATING_URL' as const,
      msg: 'Validating media headers, content type, and platform origin protocol...',
      delay: 500,
    },
    {
      status: 'DETECTING_PLATFORM' as const,
      msg: `Platform confirmed as ${current.platform}. Selected engine: ${
        current.aiWebsite === 'META_AI' ? 'Meta AI (Llama Vision 405B)' : 'Grok (Grok-2 Vision)'
      }...`,
      delay: 1100,
    },
    {
      status: 'CHECKING_SESSION' as const,
      msg: 'Verifying authorized persistent browser session and security perimeter...',
      delay: 1800,
    },
    {
      status: 'ANALYZING' as const,
      msg: 'Inspecting spatial frequency anomalies, diffusion noise residuals, and phoneme-viseme sync...',
      delay: 2600,
    },
    {
      status: 'COMPLETED' as const,
      msg: 'Forensic inspection completed. Compiling certified ShieldXL verdict report.',
      delay: 3600,
    },
  ];

  const timeouts: any[] = [];

  for (const step of steps) {
    const t = setTimeout(() => {
      if (isCancelled) return;

      const updated: AnalysisItem = {
        ...current,
        jobStatus: step.status,
        browserWorkflowStatus: step.msg,
        updatedAt: new Date().toISOString(),
      };

      if (step.status === 'COMPLETED') {
        const isMeta = current.aiWebsite === 'META_AI';
        const isManipulated = !current.originalUrl?.toLowerCase().includes('genuine');

        updated.resultCategory = isManipulated ? 'POTENTIAL_MANIPULATION' : 'NO_STRONG_SIGNALS_DETECTED';
        updated.isManipulatedProbability = isManipulated ? 0.924 : 0.058;
        updated.analysisTimestamp = new Date().toISOString();

        if (isManipulated) {
          updated.observations = isMeta
            ? [
                'Deepfake boundary mask blending artifacts detected along jawline and ear margins (SSIM delta: 0.19)',
                'Audio-visual latency: Subject lip movements lag voice audio by 125ms across key phonemes',
                'High-frequency spatial noise grid signature consistent with latent diffusion video inpainting',
                'Specular corneal reflection vectors diverge from ambient background illumination sources',
              ]
            : [
                'Temporal jitter and synthetic frame warping identified across rapid movement sequence',
                'Neural voice cloning spectral anomalies: unnatural harmonic flattening in higher frequencies',
                'Inconsistent earlobe and hair boundary geometry during horizontal head rotation',
                'Generative hallucination observed in background architectural elements across frames 90-210',
              ];

          updated.limitations = [
            'H.264/AV1 compression re-encoding introduces compression macroblocking',
            'Absence of original sensor RAW metadata limits hardware fingerprint extraction',
          ];

          updated.actualAiResponse = `### ShieldXL Certified Forensic Analysis Report (${
            isMeta ? 'Meta AI Vision Engine' : 'Grok-2 Vision Engine'
          })

**Target URL:** ${current.originalUrl}  
**Platform Classification:** ${current.platform} Media Stream  
**Verdict:** High Probability of Synthetic Manipulation (${(updated.isManipulatedProbability * 100).toFixed(1)}% Confidence)

#### Forensic Indicators
1. **Facial Boundary & Inpainting Discontinuity:** The boundary between the subject's face and natural skin tones demonstrates spatial Gaussian smoothing characteristic of automated face-swap neural networks.
2. **Audio-Visual Asynchrony:** Spectral acoustic analysis reveals a distinct 125ms phase offset between the acoustic release of bilabial consonants and visual mouth articulation.
3. **Generative Artifacts:** Residual high-frequency checkerboard patterns detected in the gradient domain, matching diffusion model upsampling filters.

**Analyst Recommendation:** Categorize as Synthetically Altered Media. Escalate to Reviewer Queue and attach forensic verification certificate.`;
        } else {
          updated.observations = [
            'Natural motion blur and optical shutter physics consistent across all analyzed frames',
            'Subsurface light scattering in skin tones matches ambient lighting conditions',
            'Organic ocular blink frequency of 16-18 blinks per minute verified',
            'Audio acoustic harmonics demonstrate authentic spatial reverberation without neural vocoder artifacts',
          ];
          updated.limitations = ['Re-encoded social stream resolution applied'];
          updated.actualAiResponse = `### ShieldXL Certified Forensic Analysis Report (${
            isMeta ? 'Meta AI Vision Engine' : 'Grok-2 Vision Engine'
          })

**Target URL:** ${current.originalUrl}  
**Verdict:** Authentic Media / No Significant Manipulation Signatures Detected (94.2% Authenticity)

**Summary:**
Forensic visual and acoustic scans found no signatures of generative inpainting, deepfake reenactment, or neural voice cloning. Media integrity verified.`;
        }

        saveStoredJob(updated);
        addNotification({
          type: isManipulated ? 'HIGH_RISK_MANIPULATION_DETECTED' : 'ANALYSIS_COMPLETED',
          message: `ShieldXL Alert: Analysis completed for ${current.platform} post. Verdict: ${
            isManipulated ? 'Potential Manipulation (92.4%)' : 'Authentic Media'
          }.`,
          channel: 'IN_APP',
        });

        if (onComplete) onComplete(updated);
      } else {
        saveStoredJob(updated);
      }

      onUpdate(updated);
    }, step.delay);

    timeouts.push(t);
  }

  return () => {
    isCancelled = true;
    timeouts.forEach(clearTimeout);
  };
};

/**
 * Manage notifications in localStorage
 */
export const getStoredNotifications = (): NotificationItem[] => {
  try {
    const raw = localStorage.getItem('shieldxl_notifications');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}
  return [...SEED_NOTIFICATIONS];
};

export const addNotification = (notif: Partial<NotificationItem>): void => {
  const current = getStoredNotifications();
  const newItem: NotificationItem = {
    _id: `notif_${Date.now()}`,
    recipient: 'analyst_01',
    type: notif.type || 'ANALYSIS_COMPLETED',
    message: notif.message || 'Analysis completed successfully.',
    channel: notif.channel || 'IN_APP',
    deliveryStatus: 'SENT',
    createdAt: new Date().toISOString(),
  };
  current.unshift(newItem);
  localStorage.setItem('shieldxl_notifications', JSON.stringify(current));
};
