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

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  accountStatus?: string;
}

export interface PlatformDetection {
  platform: Platform;
  normalizedUrl: string;
  hostname: string;
  isValid: boolean;
  isSupported: boolean;
  selectedAiWebsite?: AIWebsite;
  mediaTypeHint?: 'IMAGE' | 'VIDEO' | 'POST' | 'UNKNOWN';
  sessionStatus?: 'AUTHENTICATED' | 'REQUIRES_SETUP' | 'OFFLINE' | 'UNKNOWN';
  errorMessage?: string;
}

export interface AnalysisItem {
  _id: string;
  owner: User | string;
  originalUrl?: string;
  normalizedUrl?: string;
  platform: Platform;
  aiWebsite: AIWebsite;
  inputSourceType: 'ORIGINAL_POST_URL' | 'USER_UPLOAD' | 'MANUAL_ENTRY';
  uploadedFileName?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'POST' | 'UNKNOWN';
  jobStatus: JobStatus;
  resultCategory?: ResultCategory;
  actualAiResponse?: string;
  observations: string[];
  limitations: string[];
  isManipulatedProbability?: number | null;
  browserWorkflowStatus: string;
  analysisTimestamp?: string;
  errorCode?: string;
  requiresReview: boolean;
  reviewerDecision?: {
    decision: string;
    notes?: string;
    reviewerId?: string;
    reviewedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationItem {
  _id: string;
  recipient: string;
  analysis?: AnalysisItem;
  type: string;
  message: string;
  channel: 'EMAIL' | 'IN_APP';
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
  readAt?: string;
  deliveredAt?: string;
  createdAt: string;
}

export interface AiServiceStatus {
  service: AIWebsite;
  isAvailable: boolean;
  isAuthenticated: boolean;
  requiresManualSetup: boolean;
  lastChecked: string;
  statusMessage: string;
  lastVerification?: {
    timestamp: string;
    isAuthenticated: boolean;
    statusMessage: string;
  };
  lastAnalysisAttempt?: {
    timestamp: string;
    success: boolean;
    resultSummary: string;
  };
  lastError?: string | null;
  profileDirMasked?: string;
  isInteractiveLoginActive?: boolean;
  hasStorageStateFile?: boolean;
}

export interface AiStatusResponse {
  services: {
    metaAi: AiServiceStatus;
    grok: AiServiceStatus;
  };
  notifications: {
    emailConfigured: boolean;
    host: string;
  };
}
