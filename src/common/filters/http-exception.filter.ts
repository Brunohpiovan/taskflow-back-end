import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

export interface ErrorResponse {
  data: null;
  message: string;
  error?: string;
  statusCode: number;
  details?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : null;

    let message: string;
    let details: unknown;

    if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
      const body = exceptionResponse as Record<string, unknown>;
      const rawMessage = body.message;
      if (Array.isArray(rawMessage)) {
        message = rawMessage.length > 0 ? String(rawMessage[0]) : 'Dados inválidos';
        details = rawMessage;
      } else {
        message = (rawMessage as string) ?? (body.error as string) ?? 'Erro interno';
        details = body.details;
      }
    } else if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (exception instanceof Error) {
      message = exception.message;
    } else {
      message = 'Erro interno do servidor';
    }

    const errorResponse: ErrorResponse = {
      data: null,
      message,
      statusCode: status,
      error: this.getErrorName(status),
    };

    if (details !== undefined && process.env.NODE_ENV !== 'production') {
      errorResponse.details = details;
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(errorResponse);
  }

  private getErrorName(status: number): string {
    const names: Record<number, string> = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      409: 'Conflict',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
    };
    return names[status] ?? 'Error';
  }
}
