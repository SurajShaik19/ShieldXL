import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IReview extends Document {
  analysis: Types.ObjectId;
  reviewer: Types.ObjectId;
  decision: 'CONFIRMED_MANIPULATION' | 'CONFIRMED_AUTHENTIC' | 'INCONCLUSIVE_REVIEW' | 'FLAGGED_FOR_ESCALATION';
  notes: string;
  escalationStatus: 'NONE' | 'ESCALATED_TO_TIER2' | 'RESOLVED';
  createdAt: Date;
  updatedAt: Date;
}

const ReviewSchema = new Schema<IReview>(
  {
    analysis: { type: Schema.Types.ObjectId, ref: 'Analysis', required: true, index: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    decision: {
      type: String,
      enum: ['CONFIRMED_MANIPULATION', 'CONFIRMED_AUTHENTIC', 'INCONCLUSIVE_REVIEW', 'FLAGGED_FOR_ESCALATION'],
      required: true,
    },
    notes: { type: String, required: true },
    escalationStatus: {
      type: String,
      enum: ['NONE', 'ESCALATED_TO_TIER2', 'RESOLVED'],
      default: 'NONE',
    },
  },
  {
    timestamps: true,
  }
);

export const ReviewModel = mongoose.models.Review || mongoose.model<IReview>('Review', ReviewSchema);
