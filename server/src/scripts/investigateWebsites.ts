import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

async function investigate() {
  console.log('--- STARTING AI WEBSITES INVESTIGATION ---');

  const browser = await chromium.launch({
    headless: true,
  });

  const report: {
    metaAi: Record<string, any>;
    grok: Record<string, any>;
  } = {
    metaAi: {},
    grok: {},
  };

  // 1. Investigate Meta AI
  console.log('\n[1/2] Probing Meta AI (https://www.meta.ai)...');
  const metaContext = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const metaPage = await metaContext.newPage();

  try {
    const metaResponse = await metaPage.goto('https://www.meta.ai', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    await metaPage.waitForTimeout(4000);

    const metaUrl = metaPage.url();
    const metaTitle = await metaPage.title();
    const metaStatus = metaResponse?.status();

    // Check for login indicators or prompt boxes
    const hasTextarea = (await metaPage.$$('textarea')).length > 0;
    const hasContentEditable = (await metaPage.$$('[contenteditable="true"]')).length > 0;
    const inputPlaceholders = await metaPage.$$eval('textarea, [contenteditable="true"], input', (els) =>
      els.map((e) => (e as HTMLInputElement).placeholder || (e as HTMLElement).getAttribute('aria-label') || '')
    );
    const buttonTexts = await metaPage.$$eval('button', (els) =>
      els.map((e) => e.innerText?.trim()).filter(Boolean)
    );
    const bodySnippet = (await metaPage.innerText('body')).slice(0, 500);

    const requiresAuth =
      buttonTexts.some((b) => /log in|sign in|continue with/i.test(b)) ||
      bodySnippet.toLowerCase().includes('log in') ||
      metaUrl.includes('/login');

    report.metaAi = {
      initialStatus: metaStatus,
      resolvedUrl: metaUrl,
      title: metaTitle,
      hasTextarea,
      hasContentEditable,
      inputPlaceholders: inputPlaceholders.slice(0, 5),
      requiresAuth,
      detectedButtons: buttonTexts.slice(0, 10),
      bodyPreview: bodySnippet.replace(/\n+/g, ' '),
    };

    console.log('Meta AI Result:', JSON.stringify(report.metaAi, null, 2));
  } catch (err: any) {
    console.error('Meta AI Investigation failed:', err.message);
    report.metaAi = { error: err.message };
  } finally {
    await metaContext.close();
  }

  // 2. Investigate Grok
  console.log('\n[2/2] Probing Grok (https://grok.com)...');
  const grokContext = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  });
  const grokPage = await grokContext.newPage();

  try {
    const grokResponse = await grokPage.goto('https://grok.com', {
      timeout: 30000,
      waitUntil: 'domcontentloaded',
    });

    await grokPage.waitForTimeout(4000);

    const grokUrl = grokPage.url();
    const grokTitle = await grokPage.title();
    const grokStatus = grokResponse?.status();

    const hasTextarea = (await grokPage.$$('textarea')).length > 0;
    const hasContentEditable = (await grokPage.$$('[contenteditable="true"]')).length > 0;
    const inputPlaceholders = await grokPage.$$eval('textarea, [contenteditable="true"], input', (els) =>
      els.map((e) => (e as HTMLInputElement).placeholder || (e as HTMLElement).getAttribute('aria-label') || '')
    );
    const buttonTexts = await grokPage.$$eval('button, a', (els) =>
      els.map((e) => (e as HTMLElement).innerText?.trim()).filter(Boolean)
    );
    const bodySnippet = (await grokPage.innerText('body')).slice(0, 500);

    const requiresAuth =
      buttonTexts.some((b) => /sign in|log in/i.test(b)) ||
      grokUrl.includes('/login') ||
      bodySnippet.toLowerCase().includes('sign in');

    report.grok = {
      initialStatus: grokStatus,
      resolvedUrl: grokUrl,
      title: grokTitle,
      hasTextarea,
      hasContentEditable,
      inputPlaceholders: inputPlaceholders.slice(0, 5),
      requiresAuth,
      detectedButtons: buttonTexts.slice(0, 10),
      bodyPreview: bodySnippet.replace(/\n+/g, ' '),
    };

    console.log('Grok Result:', JSON.stringify(report.grok, null, 2));
  } catch (err: any) {
    console.error('Grok Investigation failed:', err.message);
    report.grok = { error: err.message };
  } finally {
    await grokContext.close();
  }

  await browser.close();

  // Save report
  const docPath = path.resolve('../docs/AI_WEBSITE_INVESTIGATION.json');
  fs.writeFileSync(docPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to ${docPath}`);
}

investigate();
