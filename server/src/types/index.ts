export type Platform = 'META' | 'X' | 'UNSUPPORTED';

export type AIWebsite = 'META_AI' | 'GROK';

export type ResultCategory =
  | 'POTENTIAL_MANIPULATION'
  | 'NO_STRONG_SIGNALS_DETECTED'
  | 'INCONCLUSIVE'
  | 'UNABLE_TO_ANALYZE'
  | 'ANALYSIS_FAILED';

export type JobStatus =
  | 'PENDING'
  | 'VALIDATING_URL'
  | 'DETECTING_PLATFORM'
  | 'CHECKING_SESSION'
  | 'SUBMITTING_URL'
  | 'WAITING_FOR_AI_RESPONSE'
  | 'WAITING_FOR_USER'
  | 'ANALYZING'
  | 'COMPLETED'
  | 'INCONCLUSIVE'
  | 'FAILED'
  | 'UNABLE_TO_ANALYZE';

export type UserRole = 'USER' | 'REVIEWER' | 'ADMIN';

export type InputSourceType = 'ORIGINAL_POST_URL' | 'USER_UPLOAD' | 'MANUAL_ENTRY';

export type MediaType = 'IMAGE' | 'VIDEO' | 'POST' | 'UNKNOWN';

export interface PlatformDetectionResult {
  platform: Platform;
  normalizedUrl: string;
  hostname: string;
  isValid: boolean;
  isSupported: boolean;
  selectedAiWebsite?: AIWebsite;
  mediaTypeHint?: MediaType;
  errorMessage?: string;
}

export interface AiSessionStatus {
  service: AIWebsite;
  isAvailable: boolean;
  isAuthenticated: boolean;
  requiresManualSetup: boolean;
  lastChecked: Date;
  statusMessage: string;
  lastVerification?: {
    timestamp: Date;
    isAuthenticated: boolean;
    statusMessage: string;
  };
  lastAnalysisAttempt?: {
    timestamp: Date;
    success: boolean;
    resultSummary: string;
  };
  lastError?: string | null;
  profileDirMasked?: string;
  isInteractiveLoginActive?: boolean;
  hasStorageStateFile?: boolean;
}

export interface BrowserExecutionResult {
  success: boolean;
  aiWebsite: AIWebsite;
  responseRaw?: string;
  category: ResultCategory;
  observations: string[];
  limitations: string[];
  isManipulatedProbability?: number | null; // Calibrated only if detector actually supplies
  error?: string;
  browserWorkflowStatus: string;
  screenshotBase64?: string;
  requiresManualAction?: boolean;
  suggestedAction?: string;
}

export interface UserTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}
