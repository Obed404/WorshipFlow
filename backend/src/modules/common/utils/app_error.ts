import { HTTP_STATUS, HttpStatus } from './status_codes.js';

export class AppError extends Error {
  public readonly statusCode: HttpStatus;
  public readonly isOperational: boolean;
  public readonly details?: any;

  constructor(
    message: string,
    statusCode: HttpStatus = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    details?: any,
    isOperational: boolean = true
  ) {
    super(message);

    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }

    this.name = this.constructor.name;
  }

  static badRequest(message: string, details?: any): AppError {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, details);
  }

  static unauthorized(message: string = 'Unauthorized', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.UNAUTHORIZED, details);
  }

  static forbidden(message: string = 'Forbidden', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.FORBIDDEN, details);
  }

  static notFound(message: string = 'Resource not found', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.NOT_FOUND, details);
  }

  static conflict(message: string = 'Conflict', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.CONFLICT, details);
  }

  static unprocessableEntity(message: string = 'Unprocessable entity', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.UNPROCESSABLE_ENTITY, details);
  }

  static internalServerError(message: string = 'Internal server error', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, details, false);
  }

  static databaseError(message: string = 'Database error', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, details, false);
  }

  static validationError(message: string = 'Validation failed', details?: any): AppError {
    return new AppError(message, HTTP_STATUS.BAD_REQUEST, details);
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      isOperational: this.isOperational,
      ...(process.env.NODE_ENV === 'development' && { stack: this.stack }),
    };
  }
}