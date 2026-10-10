import { app } from './app.js';
import { config } from './config/index.js';
import { connectDB, disconnectDB } from './config/db.js';
import { logger } from './config/logger.js';
import { browserSessionManager } from './services/browserSessionManager.js';

async function bootstrap() {
  try {
    await connectDB();

    const server = app.listen(config.port, () => {
      logger.info(`Server running in ${config.env} mode on http://localhost:${config.port}`);
      logger.info(`Ready to route Meta (FB/IG) to Meta AI and X/Twitter to Grok`);
    });

    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await browserSessionManager.closeAll();
          await disconnectDB();
          logger.info('Clean shutdown completed.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, 'Error during shutdown');
          process.exit(1);
        }
      });
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  } catch (err: any) {
    logger.fatal({ err: err.message }, 'Bootstrap fatal error. Server halted.');
    process.exit(1);
  }
}

bootstrap();
