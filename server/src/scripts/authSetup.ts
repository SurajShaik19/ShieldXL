import readline from 'readline';
import { BrowserSessionManager } from '../services/browserSessionManager.js';
import { AIWebsite } from '../types/index.js';

async function main() {
  const arg = (process.argv[2] || '').toLowerCase();
  let service: AIWebsite;

  if (arg === 'meta' || arg === 'meta_ai') {
    service = 'META_AI';
  } else if (arg === 'grok') {
    service = 'GROK';
  } else {
    console.error('Usage: tsx src/scripts/authSetup.ts <meta|grok>');
    process.exit(1);
  }

  console.log('=====================================================');
  console.log(` INTERACTIVE AUTHENTICATION SETUP FOR ${service}`);
  console.log('=====================================================');
  console.log(`Launching headed browser for ${service}...`);
  console.log('Please log into your account in the browser window.');
  console.log('Solve any MFA, push notifications, or CAPTCHA challenges.');
  console.log('Once you are logged in and see the chat interface,');
  console.log('RETURN TO THIS TERMINAL and press [ENTER] to save session.');
  console.log('=====================================================\n');

  const sessionManager = BrowserSessionManager.getInstance();
  const context = await sessionManager.getPersistentContext(service, false); // Headed window
  const page = await context.newPage();

  const targetUrl = service === 'META_AI' ? 'https://www.meta.ai/' : 'https://grok.com/';
  await page.goto(targetUrl, { timeout: 60000, waitUntil: 'domcontentloaded' });

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  await new Promise<void>((resolve) => {
    rl.question('\n>>> Press [ENTER] once you have successfully logged in: ', () => {
      rl.close();
      resolve();
    });
  });

  console.log('Saving session and closing browser context...');
  await page.waitForTimeout(2000);
  await context.close();
  console.log(`\n[SUCCESS] Session profile for ${service} has been preserved in server/profiles/!`);
  console.log('Subsequent automated deepfake analyses can now leverage this authenticated profile.');
  process.exit(0);
}

main().catch((err) => {
  console.error('Authentication setup failed:', err);
  process.exit(1);
});
