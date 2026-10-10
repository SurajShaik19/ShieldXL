import { BrowserSessionManager } from '../browserSessionManager.js';
import { BrowserExecutionResult } from '../../types/index.js';
import { ResponseInterpreter } from './responseInterpreter.js';
import { logger } from '../../config/logger.js';

export class GrokBrowserService {
  /**
   * Automates submission of X.com/Twitter URL or media to Grok website
   */
  public static async analyzeUrl(url: string): Promise<BrowserExecutionResult> {
    const sessionManager = BrowserSessionManager.getInstance();
    const releaseLock = await sessionManager.acquireLock('GROK');

    try {
      logger.info({ url }, 'Initiating Grok browser workflow...');
      const context = await sessionManager.getPersistentContext('GROK');
      const page = await context.newPage();

      try {
        await page.goto('https://grok.com/', {
          timeout: 45000,
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(3000);

        // Check for Sign in button indicating unauthenticated state
        const isAuthBlocked = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button, a'));
          return btns.some((b) => /sign in|sign up/i.test(b.textContent || ''));
        });

        if (isAuthBlocked) {
          logger.warn('Grok requires interactive login to answer questions. Halting automated query.');
          return {
            success: false,
            aiWebsite: 'GROK',
            category: 'UNABLE_TO_ANALYZE',
            browserWorkflowStatus: 'AUTHENTICATION_REQUIRED',
            requiresManualAction: true,
            suggestedAction:
              'Grok session is unauthenticated. Run `npm run auth:grok` on the server or proceed with manual verification workflow.',
            observations: ['Grok requires user sign-in to complete generative AI queries.'],
            limitations: ['Grok guest mode displays "Sign up to continue" modal upon prompt submission.'],
          };
        }

        // Locate textarea
        const textarea = page.locator('textarea[placeholder*="Ask Grok"], textarea').first();
        const inputFound = await textarea.isVisible({ timeout: 5000 }).catch(() => false);

        if (!inputFound) {
          return {
            success: false,
            aiWebsite: 'GROK',
            category: 'ANALYSIS_FAILED',
            browserWorkflowStatus: 'INPUT_INTERFACE_CHANGED',
            requiresManualAction: true,
            suggestedAction: 'Grok input interface could not be located.',
            observations: ['Textarea element was not detected on https://grok.com/'],
            limitations: ['Grok UI layout change.'],
          };
        }

        const promptText = `Analyze this X.com/Twitter post for any deepfake signs, AI manipulation, face alteration, or synthetic artifacts: ${url}`;

        await textarea.click();
        await page.keyboard.type(promptText, { delay: 15 });
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        logger.info('Submitted prompt to Grok. Waiting for response generation...');

        // Wait for generation
        await page.waitForTimeout(12000);

        // Check if sign-up dialog intercepted
        const hasSignupDialog = await page.evaluate(() => {
          const body = document.body.innerText || '';
          return body.includes('Sign up to continue seamlessly') || body.includes('Sign up for free');
        });

        if (hasSignupDialog) {
          return {
            success: false,
            aiWebsite: 'GROK',
            category: 'UNABLE_TO_ANALYZE',
            browserWorkflowStatus: 'AUTHENTICATION_REQUIRED',
            requiresManualAction: true,
            suggestedAction: 'Grok presented an authentication prompt. Run `npm run auth:grok` to establish authorized session.',
            observations: ['Grok presented a modal: "Sign up to continue seamlessly with Grok\'s full power"'],
            limitations: ['Query blocked by guest quota / unauthenticated gate.'],
          };
        }

        // Extract response paragraphs
        const responseText = await page.evaluate(() => {
          const candidateElements = Array.from(
            document.querySelectorAll('div[data-message-author-role="assistant"], div.message-bubble, p, div[dir="auto"]')
          );
          const valid = candidateElements
            .map((el) => el.textContent?.trim() || '')
            .filter((t) => t.length > 50 && !t.includes('Ask Grok anything') && !t.includes('Cookie Settings'));
          return valid.length > 0 ? valid[valid.length - 1] : '';
        });

        if (!responseText) {
          return {
            success: false,
            aiWebsite: 'GROK',
            category: 'INCONCLUSIVE',
            browserWorkflowStatus: 'NO_RESPONSE_CAPTURED',
            requiresManualAction: true,
            suggestedAction: 'No visible response captured from Grok within timeout.',
            observations: ['Grok did not return an observable text block within 15 seconds.'],
            limitations: ['Response timeout or streaming delay.'],
          };
        }

        const interpretation = ResponseInterpreter.interpret(responseText);

        return {
          success: true,
          aiWebsite: 'GROK',
          responseRaw: responseText,
          category: interpretation.category,
          observations: interpretation.observations,
          limitations: interpretation.limitations,
          browserWorkflowStatus: 'COMPLETED',
          requiresManualAction: interpretation.category === 'UNABLE_TO_ANALYZE',
          suggestedAction:
            interpretation.category === 'UNABLE_TO_ANALYZE'
              ? 'Grok cannot directly inspect the X.com link. Upload the media file directly for analysis.'
              : undefined,
        };
      } finally {
        await page.close().catch(() => {});
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Grok automation error');
      return {
        success: false,
        aiWebsite: 'GROK',
        category: 'ANALYSIS_FAILED',
        browserWorkflowStatus: 'BROWSER_EXCEPTION',
        error: err.message,
        requiresManualAction: true,
        suggestedAction: 'Check network connectivity or execute manual fallback review.',
        observations: [`Browser error occurred: ${err.message}`],
        limitations: ['Execution interrupted by browser timeout or connectivity exception.'],
      };
    } finally {
      releaseLock();
    }
  }
}
