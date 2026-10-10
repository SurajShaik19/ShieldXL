import { PlatformDetectionService } from './platformDetectionService.js';
import { MetaAiBrowserService } from './ai/metaAiBrowserService.js';
import { GrokBrowserService } from './ai/grokBrowserService.js';
import { AnalysisModel, IAnalysis } from '../models/Analysis.js';
import { UserModel, IUser } from '../models/User.js';
import { emailService } from './notifications/emailService.js';
import { logger } from '../config/logger.js';
import { AIWebsite, BrowserExecutionResult, InputSourceType } from '../types/index.js';
import { isDbConnected } from '../config/db.js';
import { memoryStore } from '../models/memoryStore.js';
import { browserSessionManager } from './browserSessionManager.js';

export class AnalysisOrchestrator {
  /**
   * Starts an asynchronous analysis job for a submitted URL or media file.
   */
  public static async createAndDispatchJob(params: {
    userId: string;
    url?: string;
    inputSourceType: InputSourceType;
    uploadedFilePath?: string;
    uploadedFileName?: string;
  }): Promise<IAnalysis> {
    const { userId, url, inputSourceType, uploadedFilePath, uploadedFileName } = params;

    let platform: import('../types/index.js').Platform = 'UNSUPPORTED';
    let selectedAiWebsite: AIWebsite = 'META_AI';
    let normalizedUrl: string | undefined = undefined;

    if (inputSourceType === 'ORIGINAL_POST_URL') {
      if (!url) {
        throw new Error('A valid social media post URL is required.');
      }

      // Step 1: Detect Platform & Validate
      const detection = PlatformDetectionService.detect(url);
      if (!detection.isValid || !detection.isSupported) {
        throw new Error(detection.errorMessage || 'Invalid or unsupported URL.');
      }

      platform = detection.platform;
      selectedAiWebsite = detection.selectedAiWebsite!;
      normalizedUrl = detection.normalizedUrl;

      if (isDbConnected()) {
        const existingPending = await AnalysisModel.findOne({
          owner: userId,
          normalizedUrl,
          jobStatus: {
            $in: ['PENDING', 'VALIDATING_URL', 'DETECTING_PLATFORM', 'CHECKING_SESSION', 'SUBMITTING_URL', 'WAITING_FOR_AI_RESPONSE', 'ANALYZING'],
          },
        });
        if (existingPending) return existingPending;
      } else {
        const existingPending = Array.from(memoryStore.analyses.values()).find(
          (a) => a.owner === userId && a.normalizedUrl === normalizedUrl && !['COMPLETED', 'FAILED'].includes(a.jobStatus)
        );
        if (existingPending) return existingPending as any;
      }
    } else {
      // User file upload or manual entry
      platform = 'UNSUPPORTED';
      selectedAiWebsite = 'META_AI';
    }

    let analysisJob: any;
    if (isDbConnected()) {
      analysisJob = await AnalysisModel.create({
        owner: userId,
        originalUrl: url,
        normalizedUrl,
        platform,
        aiWebsite: selectedAiWebsite,
        inputSourceType,
        uploadedFilePath,
        uploadedFileName,
        jobStatus: 'PENDING',
        browserWorkflowStatus: 'Job Queued',
      });
    } else {
      analysisJob = {
        _id: 'job_' + Date.now(),
        owner: userId,
        originalUrl: url,
        normalizedUrl,
        platform,
        aiWebsite: selectedAiWebsite,
        inputSourceType,
        uploadedFilePath,
        uploadedFileName,
        mediaType: 'UNKNOWN',
        jobStatus: 'PENDING',
        browserWorkflowStatus: 'Job Queued',
        observations: [],
        limitations: [],
        requiresReview: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        save: async function () { return this; },
      };
      memoryStore.analyses.set(analysisJob._id, analysisJob);
    }

    // Run processing asynchronously in background
    setImmediate(() => {
      AnalysisOrchestrator.processJobAsync(analysisJob._id.toString()).catch((err) => {
        logger.error({ err, jobId: analysisJob._id }, 'Unhandled error in async analysis job runner');
      });
    });

    return analysisJob;
  }

  /**
   * Background state machine executing the browser workflow
   */
  public static async processJobAsync(jobId: string): Promise<void> {
    let job: any;
    let user: any;

    if (isDbConnected()) {
      job = await AnalysisModel.findById(jobId);
      if (job) {
        user = (await UserModel.findById(job.owner)) as IUser | null;
      }
    } else {
      job = memoryStore.analyses.get(jobId);
      if (job) {
        user = memoryStore.users.get(job.owner);
      }
    }

    if (!job) {
      logger.error({ jobId }, 'Analysis job not found during async execution');
      return;
    }

    try {
      // Step: VALIDATING_URL
      job.jobStatus = 'VALIDATING_URL';
      job.browserWorkflowStatus = 'Validating URL and target parameters';
      await job.save();

      // Step: DETECTING_PLATFORM
      job.jobStatus = 'DETECTING_PLATFORM';
      job.browserWorkflowStatus = `Routing to ${job.aiWebsite} based on ${job.platform} source`;
      await job.save();

      // Step: CHECKING_SESSION & SUBMITTING_URL
      job.jobStatus = 'SUBMITTING_URL';
      job.browserWorkflowStatus = `Dispatching Playwright task to ${job.aiWebsite} website`;
      await job.save();

      let result: BrowserExecutionResult;

      if (job.inputSourceType === 'ORIGINAL_POST_URL') {
        const targetUrl = job.normalizedUrl || job.originalUrl!;
        if (job.aiWebsite === 'META_AI') {
          result = await MetaAiBrowserService.analyzeUrl(targetUrl);
        } else {
          result = await GrokBrowserService.analyzeUrl(targetUrl);
        }
      } else {
        // Uploaded file workflow
        result = {
          success: false,
          aiWebsite: job.aiWebsite,
          category: 'UNABLE_TO_ANALYZE',
          browserWorkflowStatus: 'UPLOAD_WORKFLOW_AWAITING_INPUT',
          observations: ['Direct website file upload automation is prepared for manual analyst review.'],
          limitations: ['File upload requires analyst session confirmation.'],
          requiresManualAction: true,
          suggestedAction: 'Please review uploaded media in the manual verification tool.',
        };
      }

      // Record result
      job.actualAiResponse = result.responseRaw;
      job.resultCategory = result.category;
      job.observations = result.observations;
      job.limitations = result.limitations;
      job.isManipulatedProbability = result.isManipulatedProbability || null;
      job.browserWorkflowStatus = result.browserWorkflowStatus;
      job.analysisTimestamp = new Date();

      if (result.category === 'POTENTIAL_MANIPULATION') {
        job.jobStatus = 'COMPLETED';
        job.requiresReview = true;
      } else if (result.category === 'NO_STRONG_SIGNALS_DETECTED') {
        job.jobStatus = 'COMPLETED';
      } else if (result.category === 'UNABLE_TO_ANALYZE') {
        job.jobStatus = result.requiresManualAction ? 'WAITING_FOR_USER' : 'UNABLE_TO_ANALYZE';
        job.requiresReview = true;
      } else if (result.category === 'INCONCLUSIVE') {
        job.jobStatus = 'INCONCLUSIVE';
        job.requiresReview = true;
      } else {
        job.jobStatus = 'FAILED';
        job.errorMessage = result.error || 'Browser automation failed to obtain valid response.';
      }

      browserSessionManager.recordAnalysisAttempt(
        job.aiWebsite,
        result.success,
        `Result: ${job.resultCategory || job.jobStatus} (${result.browserWorkflowStatus})`
      );

      await job.save();

      // Dispatch Notifications
      if (user) {
        let notifType: 'ANALYSIS_COMPLETED' | 'REVIEW_REQUIRED' | 'AUTH_REQUIRED' | 'MEDIA_INACCESSIBLE' | 'ANALYSIS_FAILED' =
          'ANALYSIS_COMPLETED';
        let actionRecommendation = 'Review the extracted AI observations and verify contextual source.';

        if (result.browserWorkflowStatus === 'AUTHENTICATION_REQUIRED') {
          notifType = 'AUTH_REQUIRED';
          actionRecommendation = `Authorized session needed: run npm run auth:${job.aiWebsite === 'META_AI' ? 'meta' : 'grok'} on the server host.`;
        } else if (result.category === 'UNABLE_TO_ANALYZE') {
          notifType = 'MEDIA_INACCESSIBLE';
          actionRecommendation = 'The AI website could not directly access this URL. Upload the media file directly.';
        } else if (job.jobStatus === 'FAILED') {
          notifType = 'ANALYSIS_FAILED';
          actionRecommendation = 'Automation interrupted. Check the results page to retry or enter manual findings.';
        } else if (job.requiresReview) {
          notifType = 'REVIEW_REQUIRED';
          actionRecommendation = 'Potential manipulation or ambiguity detected. Escalated for human reviewer sign-off.';
        }

        const message = `Analysis for ${job.platform} URL finished with status: ${job.resultCategory || job.jobStatus}.`;

        await emailService.notifyAnalysisUpdate(user, job, notifType, message, actionRecommendation);
      }
    } catch (err: any) {
      logger.error({ err: err.message, jobId }, 'Fatal error during analysis job processing');
      job.jobStatus = 'FAILED';
      job.errorMessage = err.message;
      job.browserWorkflowStatus = 'CRITICAL_ERROR';
      await job.save();

      if (user) {
        await emailService.notifyAnalysisUpdate(
          user,
          job,
          'ANALYSIS_FAILED',
          `Analysis execution encountered an error: ${err.message}`,
          'Check system logs or submit the item for manual review.'
        );
      }
    }
  }
}
