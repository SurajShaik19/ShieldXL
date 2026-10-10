import { BrowserSessionManager } from '../browserSessionManager.js';
import { BrowserExecutionResult } from '../../types/index.js';
import { ResponseInterpreter } from './responseInterpreter.js';
import { logger } from '../../config/logger.js';

export class MetaAiBrowserService {
  /**
   * Automates submission of Facebook/Instagram URL or media to Meta AI website
   */
  public static async analyzeUrl(url: string): Promise<BrowserExecutionResult> {
    const sessionManager = BrowserSessionManager.getInstance();
    const releaseLock = await sessionManager.acquireLock('META_AI');

    try {
      logger.info({ url }, 'Initiating Meta AI browser workflow...');
      const context = await sessionManager.getPersistentContext('META_AI');
      const page = await context.newPage();

      try {
        await page.goto('https://www.meta.ai/', {
          timeout: 45000,
          waitUntil: 'domcontentloaded',
        });
        await page.waitForTimeout(3000);

        // Check authentication / blocking overlay
        const isAuthBlocked = await page.evaluate(() => {
          const body = document.body.innerText || '';
          const hasLoginButton = Array.from(document.querySelectorAll('button, a')).some((el) =>
            /log in|sign in/i.test(el.textContent || '')
          );
          return (
            hasLoginButton ||
            body.includes('Sign in to get started') ||
            body.includes('Log in or sign up')
          );
        });

        if (isAuthBlocked) {
          logger.warn('Meta AI requires interactive login. Browser workflow cannot submit query automatically.');
          return {
            success: false,
            aiWebsite: 'META_AI',
            category: 'UNABLE_TO_ANALYZE',
            browserWorkflowStatus: 'AUTHENTICATION_REQUIRED',
            requiresManualAction: true,
            suggestedAction:
              'Meta AI session is unauthenticated. Run `npm run auth:meta` on the server or proceed with manual verification workflow.',
            observations: ['Meta AI prompts: "Sign in to get started. Log in or sign up to ask Meta AI anything"'],
            limitations: ['Automation cannot proceed without an authorized persistent session profile.'],
          };
        }

        // Locate input prompt box
        const inputLocator = page.locator(
          'textarea, [contenteditable="true"], input[placeholder*="Ask Meta AI"]'
        ).first();

        const inputFound = await inputLocator.isVisible({ timeout: 5000 }).catch(() => false);
        if (!inputFound) {
          return {
            success: false,
            aiWebsite: 'META_AI',
            category: 'ANALYSIS_FAILED',
            browserWorkflowStatus: 'INPUT_INTERFACE_CHANGED',
            requiresManualAction: true,
            suggestedAction: 'Input interface could not be located. Interface may have changed.',
            observations: ['Chat prompt input field was not detected on https://www.meta.ai/'],
            limitations: ['DOM structure update detected.'],
          };
        }

        const promptText = `Analyze this social media post for any signs of deepfake manipulation, AI generation, face alteration, voice synthesis, or synthetic artifacts: ${url}`;

        // Type query into Meta AI
        await inputLocator.click();
        await page.keyboard.type(promptText, { delay: 15 });
        await page.waitForTimeout(500);
        await page.keyboard.press('Enter');

        logger.info('Submitted prompt to Meta AI. Waiting for response generation...');

        // Wait for generation to complete (look for assistant message bubbles)
        await page.waitForTimeout(10000);

        // Extract response text
        const responseText = await page.evaluate(() => {
          // Look for chat response containers
          const candidateElements = Array.from(
            document.querySelectorAll('div[data-message-author-role="assistant"], div[role="article"], div[dir="auto"], p')
          );
          const meaningful = candidateElements
            .map((el) => el.textContent?.trim() || '')
            .filter((t) => t.length > 50 && !t.includes('Ask Meta AI') && !t.includes('Log in'));
          return meaningful.length > 0 ? meaningful[meaningful.length - 1] : '';
        });

        if (!responseText) {
          return {
            success: false,
            aiWebsite: 'META_AI',
            category: 'INCONCLUSIVE',
            browserWorkflowStatus: 'NO_RESPONSE_CAPTURED',
            requiresManualAction: true,
            suggestedAction: 'Response was not visible within wait period. Consider manual submission.',
            observations: ['No text response could be safely extracted from Meta AI DOM within 15 seconds.'],
            limitations: ['Response timeout or dynamic DOM rendering delay.'],
          };
        }

        const interpretation = ResponseInterpreter.interpret(responseText);

        return {
          success: true,
          aiWebsite: 'META_AI',
          responseRaw: responseText,
          category: interpretation.category,
          observations: interpretation.observations,
          limitations: interpretation.limitations,
          browserWorkflowStatus: 'COMPLETED',
          requiresManualAction: interpretation.category === 'UNABLE_TO_ANALYZE',
          suggestedAction:
            interpretation.category === 'UNABLE_TO_ANALYZE'
              ? 'Meta AI cannot directly scrape the social link. Upload the image/video directly for analysis.'
              : undefined,
        };
      } finally {
        await page.close().catch(() => {});
      }
    } catch (err: any) {
      logger.error({ err: err.message }, 'Meta AI automation error');
      return {
        success: false,
        aiWebsite: 'META_AI',
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
