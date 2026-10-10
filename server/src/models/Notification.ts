import mongoose, { Document, Schema, Types } from 'mongoose';

export interface INotification extends Document {
  recipient: Types.ObjectId;
  analysis?: Types.ObjectId;
  type: 'ANALYSIS_COMPLETED' | 'REVIEW_REQUIRED' | 'AUTH_REQUIRED' | 'MEDIA_INACCESSIBLE' | 'ANALYSIS_FAILED';
  message: string;
  channel: 'EMAIL' | 'IN_APP';
  deliveryStatus: 'PENDING' | 'SENT' | 'FAILED';
  attemptCount: number;
  readAt?: Date;
  deliveredAt?: Date;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    analysis: { type: Schema.Types.ObjectId, ref: 'Analysis', index: true },
    type: {
      type: String,
      enum: ['ANALYSIS_COMPLETED', 'REVIEW_REQUIRED', 'AUTH_REQUIRED', 'MEDIA_INACCESSIBLE', 'ANALYSIS_FAILED'],
      required: true,
    },
    message: { type: String, required: true },
    channel: { type: String, enum: ['EMAIL', 'IN_APP'], default: 'IN_APP' },
    deliveryStatus: { type: String, enum: ['PENDING', 'SENT', 'FAILED'], default: 'PENDING', index: true },
    attemptCount: { type: Number, default: 0 },
    readAt: { type: Date },
    deliveredAt: { type: Date },
    error: { type: String },
  },
  {
    timestamps: true,
  }
);

NotificationSchema.index({ recipient: 1, readAt: 1, createdAt: -1 });

export const NotificationModel =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);
