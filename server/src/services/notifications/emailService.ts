import nodemailer from 'nodemailer';
import { config } from '../../config/index.js';
import { logger } from '../../config/logger.js';
import { NotificationModel } from '../../models/Notification.js';
import { IAnalysis } from '../../models/Analysis.js';
import { IUser } from '../../models/User.js';

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    if (config.email.host && config.email.user && config.email.password) {
      this.transporter = nodemailer.createTransport({
        host: config.email.host,
        port: config.email.port,
        secure: config.email.secure,
        auth: {
          user: config.email.user,
          pass: config.email.password,
        },
      });
      this.isConfigured = true;
      logger.info({ host: config.email.host }, 'Email transporter configured with custom SMTP.');
    } else {
      // Missing credentials: do not claim success or silently fake credentials
      this.isConfigured = false;
      logger.info('Email credentials not fully configured; notifications will record delivery status as FAILED or PENDING.');
    }
  }

  public getStatus(): { isConfigured: boolean; host: string } {
    return {
      isConfigured: this.isConfigured,
      host: config.email.host,
    };
  }

  /**
   * Dispatches analysis notification via email and records in-app notification.
   */
  public async notifyAnalysisUpdate(
    user: IUser,
    analysis: IAnalysis,
    type: 'ANALYSIS_COMPLETED' | 'REVIEW_REQUIRED' | 'AUTH_REQUIRED' | 'MEDIA_INACCESSIBLE' | 'ANALYSIS_FAILED',
    message: string,
    actionRecommendation: string
  ): Promise<void> {
    const resultsUrl = `${config.clientOrigin}/results/${analysis._id}`;

    // Create In-App Notification record
    await NotificationModel.create({
      recipient: user._id,
      analysis: analysis._id,
      type,
      message,
      channel: 'IN_APP',
      deliveryStatus: 'SENT',
      deliveredAt: new Date(),
    });

    // Create Email Notification record
    const emailNotification = await NotificationModel.create({
      recipient: user._id,
      analysis: analysis._id,
      type,
      message,
      channel: 'EMAIL',
      deliveryStatus: 'PENDING',
      attemptCount: 1,
    });

    if (!this.isConfigured || !this.transporter) {
      emailNotification.deliveryStatus = 'FAILED';
      emailNotification.error = 'SMTP credentials not configured on server.';
      await emailNotification.save();
      logger.warn({ userId: user._id }, 'Skipped email delivery: SMTP credentials missing.');
      return;
    }

    try {
      const subject = `[ShieldXL Cyber Intelligence] Analysis Update: ${analysis.resultCategory || type}`;
      const htmlBody = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0c1322; color: #f1f5f9; padding: 24px; border-radius: 8px; border: 1px solid #1e2d4d;">
          <h2 style="color: #22d3ee; margin-top: 0;">AI-Assisted Media Assessment Alert</h2>
          <p style="font-size: 15px; color: #cbd5e1;">${message}</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid #1e2d4d;"><strong>Job Reference:</strong></td>
              <td style="padding: 8px 0; color: #f1f5f9; border-bottom: 1px solid #1e2d4d;">${analysis._id}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid #1e2d4d;"><strong>Detected Platform:</strong></td>
              <td style="padding: 8px 0; color: #f1f5f9; border-bottom: 1px solid #1e2d4d;">${analysis.platform}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid #1e2d4d;"><strong>AI Website Used:</strong></td>
              <td style="padding: 8px 0; color: #f1f5f9; border-bottom: 1px solid #1e2d4d;">${analysis.aiWebsite}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid #1e2d4d;"><strong>Result Category:</strong></td>
              <td style="padding: 8px 0; color: #22d3ee; font-weight: bold; border-bottom: 1px solid #1e2d4d;">${analysis.resultCategory || 'IN_PROGRESS'}</td>
            </tr>
            ${analysis.originalUrl ? `
            <tr>
              <td style="padding: 8px 0; color: #94a3b8; border-bottom: 1px solid #1e2d4d;"><strong>Submitted URL:</strong></td>
              <td style="padding: 8px 0; color: #38bdf8; word-break: break-all; border-bottom: 1px solid #1e2d4d;">${analysis.originalUrl}</td>
            </tr>` : ''}
          </table>

          <div style="background: #141e34; padding: 14px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #06b6d4;">
            <p style="margin: 0; font-size: 13px; color: #cbd5e1;"><strong>Recommended Action:</strong> ${actionRecommendation}</p>
          </div>

          <div style="background: #1e293b; padding: 12px; border-radius: 6px; margin: 16px 0; font-size: 12px; color: #94a3b8;">
            <strong>Important Advisory:</strong> Assessments reflect visible indicators evaluated by consumer AI interfaces. They represent non-forensic, AI-assisted observations and must be evaluated alongside contextual provenance.
          </div>

          <p style="margin-top: 24px;">
            <a href="${resultsUrl}" style="display: inline-block; background: #0891b2; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600;">View Complete Analysis Dashboard</a>
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: config.email.from,
        to: user.email,
        subject,
        html: htmlBody,
      });

      emailNotification.deliveryStatus = 'SENT';
      emailNotification.deliveredAt = new Date();
      await emailNotification.save();
      logger.info({ userId: user._id, to: user.email }, 'Email notification delivered successfully.');
    } catch (err: any) {
      emailNotification.deliveryStatus = 'FAILED';
      emailNotification.error = err.message;
      await emailNotification.save();
      logger.error({ err, userId: user._id }, 'Failed to deliver email notification.');
    }
  }
}

export const emailService = new EmailService();
