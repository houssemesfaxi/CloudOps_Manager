import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Request, Response } from 'express';

/** Prisma error codes: https://www.prisma.io/docs/orm/reference/error-reference */
function mapPrismaError(e: Prisma.PrismaClientKnownRequestError): {
  statusCode: number;
  message: string;
  error: string;
} {
  switch (e.code) {
    case 'P2002': // unique constraint
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Cette ressource existe déjà',
        error: 'Conflict',
      };
    case 'P2003': // foreign key: still referenced by other rows
      return {
        statusCode: HttpStatus.CONFLICT,
        message: 'Ressource liée à d’autres données',
        error: 'Conflict',
      };
    case 'P2025': // record not found
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Ressource introuvable',
        error: 'Not Found',
      };
    default:
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
        error: 'Internal Server Error',
      };
  }
}

export interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

/**
 * Turns every error into the same JSON shape (docs/03, section 4):
 * { statusCode, message, error, timestamp, path }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const body = exception.getResponse();

      if (typeof body === 'string') {
        message = body;
        error = exception.name;
      } else {
        const b = body as { message?: string | string[]; error?: string };
        message = b.message ?? exception.message;
        error = b.error ?? exception.name;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      ({ statusCode, message, error } = mapPrismaError(exception));
      if (statusCode === HttpStatus.INTERNAL_SERVER_ERROR) {
        this.logger.error(exception.message);
      }
    } else {
      // Unexpected error: log it, but never send internal details to the client.
      this.logger.error(
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const payload: ErrorResponse = {
      statusCode,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    response.status(statusCode).json(payload);
  }
}
