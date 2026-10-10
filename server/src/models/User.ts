import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types/index.js';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  notificationPreferences: {
    emailOnComplete: boolean;
    emailOnReviewNeeded: boolean;
    emailOnFailure: boolean;
  };
  accountStatus: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['USER', 'REVIEWER', 'ADMIN'], default: 'USER', index: true },
    notificationPreferences: {
      emailOnComplete: { type: Boolean, default: true },
      emailOnReviewNeeded: { type: Boolean, default: true },
      emailOnFailure: { type: Boolean, default: true },
    },
    accountStatus: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
  },
  {
    timestamps: true,
  }
);

export const UserModel = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
