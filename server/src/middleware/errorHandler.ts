import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger.js';

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction): void {
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error({
    err: {
      message: err.message,
      stack: err.stack,
      name: err.name,
    },
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
  }, 'Unhandled request error');

  res.status(status).json({
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}
