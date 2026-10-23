import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app_error.js';
import { HTTP_STATUS } from '../utils/status_codes.js';
import { createErrorResponse } from '../types/api.types.js';
import { env } from '../utils/env.js';

export class ErrorHandler {
  static handleError(
    error: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    if (res.headersSent) {
      return next(error);
    }

    // Handle AppError instances
    if (error instanceof AppError) {
      const errorResponse = createErrorResponse(
        error.message,
        {
          name: error.name,
          details: error.details,
          ...(env.NODE_ENV === 'development' && { stack: error.stack }),
        }
      );

      res.status(error.statusCode).json(errorResponse);
      return;
    }

    // Handle Zod validation errors
    if (error.name === 'ZodError') {
      const zodError = error as any;
      const validationErrors = zodError.errors?.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message,
      })) || [];

      const errorResponse = createErrorResponse(
        'Validation failed',
        {
          name: 'ValidationError',
          details: validationErrors,
          ...(env.NODE_ENV === 'development' && { stack: error.stack }),
        }
      );

      res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse);
      return;
    }

    // Handle syntax errors (malformed JSON)
    if (error instanceof SyntaxError && 'status' in error && error.status === 400) {
      const errorResponse = createErrorResponse(
        'Malformed JSON payload',
        {
          name: 'SyntaxError',
          ...(env.NODE_ENV === 'development' && { stack: error.stack }),
        }
      );

      res.status(HTTP_STATUS.BAD_REQUEST).json(errorResponse);
      return;
    }

    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      const errorResponse = createErrorResponse(
        'Invalid or expired token',
        {
          name: error.name,
          ...(env.NODE_ENV === 'development' && { stack: error.stack }),
        }
      );

      res.status(HTTP_STATUS.UNAUTHORIZED).json(errorResponse);
      return;
    }

    // Default error handler
    const statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    const message = env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message || 'Internal server error';

    const errorResponse = createErrorResponse(
      message,
      {
        name: error.name || 'InternalServerError',
        ...(env.NODE_ENV === 'development' && { stack: error.stack }),
      }
    );

    res.status(statusCode).json(errorResponse);

    // Log unexpected errors
    if (env.NODE_ENV !== 'test') {
      console.error(`[${new Date().toISOString()}] Unhandled error:`, {
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: req.ip,
      });
    }
  }

  static notFound(req: Request, res: Response, next: NextFunction): void {
    const error = AppError.notFound(`Route ${req.method} ${req.url} not found`);
    ErrorHandler.handleError(error, req, res, next);
  }

  static asyncWrapper(fn: Function) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}

export const errorMiddleware = ErrorHandler.handleError;
export const notFoundMiddleware = ErrorHandler.notFound;
export const asyncWrapper = ErrorHandler.asyncWrapper;