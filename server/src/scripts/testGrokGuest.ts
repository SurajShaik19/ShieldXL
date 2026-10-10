import { chromium } from 'playwright';

async function testGrokGuest() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const page = await context.newPage();

  try {
    console.log('Navigating to Grok...');
    await page.goto('https://grok.com', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    const textarea = page.locator('textarea[placeholder*="Ask Grok"], textarea').first();
    const isVisible = await textarea.isVisible();
    console.log('Textarea visible:', isVisible);

    if (isVisible) {
      console.log('Filling test query into Grok...');
      await textarea.fill('Is this post manipulated: https://x.com/NASA/status/1234567890');
      await page.waitForTimeout(1000);
      await textarea.press('Enter');
      console.log('Pressed Enter. Waiting for reaction...');
      await page.waitForTimeout(5000);

      const urlAfter = page.url();
      console.log('URL after submission:', urlAfter);

      // Check if sign in modal appeared or if response started streaming
      const bodySnippet = (await page.innerText('body')).slice(0, 800);
      console.log('Body snippet after submission:\n', bodySnippet);

      // Look for response messages
      const messages = await page.$$eval('[data-message-author-role="assistant"], .message-bubble, p', (els) =>
        els.map((e) => (e as HTMLElement).innerText?.trim()).filter((t) => t && t.length > 20)
      );
      console.log('Candidate response paragraphs:', messages.slice(0, 5));
    }
  } catch (err: any) {
    console.error('Error testing Grok:', err.message);
  } finally {
    await browser.close();
  }
}

testGrokGuest();
