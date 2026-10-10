import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from './index.js';
import { logger } from './logger.js';
import { UserModel } from '../models/User.js';

let dbConnectedState = false;
let lastDbError: string | null = null;

export function isDbConnected(): boolean {
  return dbConnectedState || mongoose.connection.readyState === 1;
}

export function setDbConnectedForTesting(status: boolean): void {
  dbConnectedState = status;
  if (!status) {
    lastDbError = 'Test mock offline mode';
  } else {
    lastDbError = null;
  }
}

export function getDbStatus(): {
  connected: boolean;
  state: 'CONNECTED' | 'DISCONNECTED';
  error: string | null;
} {
  const connected = isDbConnected();
  return {
    connected,
    state: connected ? 'CONNECTED' : 'DISCONNECTED',
    error: connected ? null : lastDbError,
  };
}

/**
 * Seeds baseline administrative, analyst, and reviewer demo accounts if database is empty.
 * Preserves all existing records if the database already contains accounts.
 */
export async function seedMongoIfEmpty(): Promise<void> {
  try {
    const existingCount = await UserModel.countDocuments();
    if (existingCount === 0) {
      logger.info('Initializing default demo accounts in MongoDB...');
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash('Password123!', salt);

      await UserModel.create([
        {
          name: 'Analyst Demo',
          email: 'analyst@defense.agency',
          passwordHash: hash,
          role: 'USER',
          accountStatus: 'ACTIVE',
        },
        {
          name: 'Senior Reviewer',
          email: 'reviewer@defense.agency',
          passwordHash: hash,
          role: 'REVIEWER',
          accountStatus: 'ACTIVE',
        },
        {
          name: 'System Admin',
          email: 'admin@defense.agency',
          passwordHash: hash,
          role: 'ADMIN',
          accountStatus: 'ACTIVE',
        },
      ]);
      logger.info('Default demo accounts seeded into MongoDB successfully.');
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Notice during MongoDB user seed check');
  }
}

export async function connectDB(): Promise<void> {
  mongoose.set('bufferCommands', false);
  try {
    const sanitizedUri = config.mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
    logger.info({ uri: sanitizedUri }, 'Connecting to MongoDB Atlas / Local...');
    await mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 3000,
    });
    dbConnectedState = true;
    lastDbError = null;
    logger.info('Connected to MongoDB successfully.');
    await seedMongoIfEmpty();
  } catch (err: any) {
    dbConnectedState = false;
    lastDbError = err.message || 'Connection failed';
    logger.warn(
      `Could not connect to MongoDB URI (${err.message}). Database features will operate with resilient local persistence until a reachable MONGODB_URI is provided.`
    );
    logger.info('Starting server in resilient offline database mode so platform detection and AI status endpoints remain operational.');
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  dbConnectedState = false;
}
