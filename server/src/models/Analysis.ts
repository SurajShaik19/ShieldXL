import mongoose, { Document, Schema, Types } from 'mongoose';
import {
  Platform,
  AIWebsite,
  JobStatus,
  ResultCategory,
  InputSourceType,
  MediaType,
} from '../types/index.js';

export interface IAnalysis extends Document {
  owner: Types.ObjectId;
  originalUrl?: string;
  normalizedUrl?: string;
  platform: Platform;
  aiWebsite: AIWebsite;
  inputSourceType: InputSourceType;
  uploadedFilePath?: string;
  uploadedFileName?: string;
  mediaType: MediaType;
  jobStatus: JobStatus;
  resultCategory?: ResultCategory;
  actualAiResponse?: string;
  observations: string[];
  limitations: string[];
  isManipulatedProbability?: number | null;
  browserWorkflowStatus?: string;
  analysisTimestamp?: Date;
  errorCode?: string;
  errorMessage?: string;
  requiresReview: boolean;
  retentionExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AnalysisSchema = new Schema<IAnalysis>(
  {
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    originalUrl: { type: String, trim: true },
    normalizedUrl: { type: String, trim: true },
    platform: { type: String, enum: ['META', 'X', 'UNSUPPORTED'], required: true, index: true },
    aiWebsite: { type: String, enum: ['META_AI', 'GROK'], required: true, index: true },
    inputSourceType: {
      type: String,
      enum: ['ORIGINAL_POST_URL', 'USER_UPLOAD', 'MANUAL_ENTRY'],
      default: 'ORIGINAL_POST_URL',
    },
    uploadedFilePath: { type: String },
    uploadedFileName: { type: String },
    mediaType: { type: String, enum: ['IMAGE', 'VIDEO', 'POST', 'UNKNOWN'], default: 'UNKNOWN' },
    jobStatus: {
      type: String,
      enum: [
        'PENDING',
        'VALIDATING_URL',
        'DETECTING_PLATFORM',
        'CHECKING_SESSION',
        'SUBMITTING_URL',
        'WAITING_FOR_AI_RESPONSE',
        'WAITING_FOR_USER',
        'ANALYZING',
        'COMPLETED',
        'INCONCLUSIVE',
        'FAILED',
        'UNABLE_TO_ANALYZE',
      ],
      default: 'PENDING',
      index: true,
    },
    resultCategory: {
      type: String,
      enum: [
        'POTENTIAL_MANIPULATION',
        'NO_STRONG_SIGNALS_DETECTED',
        'INCONCLUSIVE',
        'UNABLE_TO_ANALYZE',
        'ANALYSIS_FAILED',
      ],
      index: true,
    },
    actualAiResponse: { type: String },
    observations: { type: [String], default: [] },
    limitations: { type: [String], default: [] },
    isManipulatedProbability: { type: Number, default: null },
    browserWorkflowStatus: { type: String, default: 'Initialized' },
    analysisTimestamp: { type: Date },
    errorCode: { type: String },
    errorMessage: { type: String },
    requiresReview: { type: Boolean, default: false, index: true },
    retentionExpiry: { type: Date },
  },
  {
    timestamps: true,
  }
);

AnalysisSchema.index({ createdAt: -1 });

export const AnalysisModel = mongoose.models.Analysis || mongoose.model<IAnalysis>('Analysis', AnalysisSchema);
