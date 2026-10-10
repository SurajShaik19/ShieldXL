import mongoose, { Document, Schema } from 'mongoose';

export type SocialProvider = 'INSTAGRAM' | 'X';
export type ConnectionStatus = 'CONNECTED' | 'EXPIRED' | 'REVOKED';

export interface ISocialConnection extends Document {
  owner: mongoose.Types.ObjectId;
  provider: SocialProvider;
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
  connectionStatus: ConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}

const SocialConnectionSchema = new Schema<ISocialConnection>(
  {
    owner: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['INSTAGRAM', 'X'],
      required: true,
    },
    providerUserId: {
      type: String,
      required: true,
    },
    providerUsername: {
      type: String,
      required: true,
    },
    profileData: {
      name: { type: String },
      avatarUrl: { type: String },
      profileUrl: { type: String },
    },
    scopes: {
      type: [String],
      default: [],
    },
    accessTokenEncrypted: {
      type: String,
      required: true,
    },
    refreshTokenEncrypted: {
      type: String,
    },
    tokenExpiresAt: {
      type: Date,
    },
    connectionStatus: {
      type: String,
      enum: ['CONNECTED', 'EXPIRED', 'REVOKED'],
      default: 'CONNECTED',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one connection per provider per user
SocialConnectionSchema.index({ owner: 1, provider: 1 }, { unique: true });

export const SocialConnectionModel = mongoose.model<ISocialConnection>(
  'SocialConnection',
  SocialConnectionSchema
);
