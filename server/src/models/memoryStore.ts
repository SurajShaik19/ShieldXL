import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

export interface MemoryUser {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'USER' | 'REVIEWER' | 'ADMIN';
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  notificationPreferences: {
    emailOnComplete: boolean;
    emailOnReviewNeeded: boolean;
    emailOnFailure: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryAnalysis {
  _id: string;
  owner: any;
  originalUrl?: string;
  normalizedUrl?: string;
  platform: 'META' | 'X' | 'UNSUPPORTED';
  aiWebsite: 'META_AI' | 'GROK';
  inputSourceType: 'ORIGINAL_POST_URL' | 'USER_UPLOAD' | 'MANUAL_ENTRY';
  uploadedFilePath?: string;
  uploadedFileName?: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'POST' | 'UNKNOWN';
  jobStatus: string;
  resultCategory?: string;
  actualAiResponse?: string;
  observations: string[];
  limitations: string[];
  isManipulatedProbability?: number | null;
  browserWorkflowStatus: string;
  analysisTimestamp?: Date;
  errorCode?: string;
  errorMessage?: string;
  requiresReview: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryNotification {
  _id: string;
  recipient: any;
  analysis?: any;
  type: string;
  message: string;
  channel: 'EMAIL' | 'IN_APP';
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
  readAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryReview {
  _id: string;
  analysis: any;
  reviewer: any;
  decision: string;
  notes: string;
  escalationStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemorySocialConnection {
  _id: string;
  owner: string;
  provider: 'INSTAGRAM' | 'X';
  providerUserId: string;
  providerUsername: string;
  profileData?: {
    name?: string;
    avatarUrl?: string;
    profileUrl?: string;
  };
  scopes: string[];
  accessTokenEncrypted: string;
  refreshTokenEncrypted?: string;
  tokenExpiresAt?: Date;
  connectionStatus: 'CONNECTED' | 'EXPIRED' | 'REVOKED';
  createdAt: Date;
  updatedAt: Date;
}

class MemoryStore {
  public users: Map<string, MemoryUser> = new Map();
  public analyses: Map<string, MemoryAnalysis> = new Map();
  public notifications: Map<string, MemoryNotification> = new Map();
  public reviews: Map<string, MemoryReview> = new Map();
  public socialConnections: Map<string, MemorySocialConnection> = new Map();

  constructor() {
    this.seedDefaults();
  }

  private seedDefaults() {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('Password123!', salt);

    // 1. Demo Analyst User
    const analyst: MemoryUser = {
      _id: 'user_analyst_001',
      name: 'Analyst Demo',
      email: 'analyst@defense.agency',
      passwordHash: hash,
      role: 'USER',
      accountStatus: 'ACTIVE',
      notificationPreferences: {
        emailOnComplete: true,
        emailOnReviewNeeded: true,
        emailOnFailure: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 2. Demo Reviewer User
    const reviewer: MemoryUser = {
      _id: 'user_reviewer_002',
      name: 'Senior Reviewer',
      email: 'reviewer@defense.agency',
      passwordHash: hash,
      role: 'REVIEWER',
      accountStatus: 'ACTIVE',
      notificationPreferences: {
        emailOnComplete: true,
        emailOnReviewNeeded: true,
        emailOnFailure: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 3. Demo Admin User
    const admin: MemoryUser = {
      _id: 'user_admin_003',
      name: 'System Admin',
      email: 'admin@defense.agency',
      passwordHash: hash,
      role: 'ADMIN',
      accountStatus: 'ACTIVE',
      notificationPreferences: {
        emailOnComplete: true,
        emailOnReviewNeeded: true,
        emailOnFailure: true,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(analyst._id, analyst);
    this.users.set(reviewer._id, reviewer);
    this.users.set(admin._id, admin);

    this.loadFromDisk();
  }

  private getStoragePath(): string {
    return path.resolve(process.cwd(), '.dev-store.json');
  }

  public save(): void {
    try {
      const data = {
        users: Array.from(this.users.entries()),
        analyses: Array.from(this.analyses.entries()),
        notifications: Array.from(this.notifications.entries()),
        reviews: Array.from(this.reviews.entries()),
        socialConnections: Array.from(this.socialConnections.entries()),
      };
      fs.writeFileSync(this.getStoragePath(), JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore disk write errors in restricted environments
    }
  }

  public loadFromDisk(): void {
    try {
      const filePath = this.getStoragePath();
      if (!fs.existsSync(filePath)) return;
      const raw = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data.users)) {
        for (const [k, v] of data.users) {
          this.users.set(k, { ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) });
        }
      }
      if (Array.isArray(data.analyses)) {
        for (const [k, v] of data.analyses) {
          this.analyses.set(k, { ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) });
        }
      }
      if (Array.isArray(data.notifications)) {
        for (const [k, v] of data.notifications) {
          this.notifications.set(k, { ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) });
        }
      }
      if (Array.isArray(data.reviews)) {
        for (const [k, v] of data.reviews) {
          this.reviews.set(k, { ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) });
        }
      }
      if (Array.isArray(data.socialConnections)) {
        for (const [k, v] of data.socialConnections) {
          this.socialConnections.set(k, { ...v, createdAt: new Date(v.createdAt), updatedAt: new Date(v.updatedAt) });
        }
      }
    } catch {
      // Ignore disk parse errors
    }
  }
}

export const memoryStore = new MemoryStore();
