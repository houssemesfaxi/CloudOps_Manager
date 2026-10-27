import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status }),
      getRequest: () => ({ url: '/api/v1/servers/42' }),
    }),
  } as unknown as ArgumentsHost;

  beforeEach(() => jest.clearAllMocks());

  it('formats an HttpException', () => {
    filter.catch(new NotFoundException('Serveur introuvable'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Serveur introuvable',
        error: 'Not Found',
        path: '/api/v1/servers/42',
      }),
    );
  });

  it('keeps the list of validation messages', () => {
    filter.catch(new BadRequestException(['name should not be empty']), host);

    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['name should not be empty'],
      }),
    );
  });

  it('turns a Prisma unique error into 409', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique failed', {
      code: 'P2002',
      clientVersion: 'test',
    });

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(409);
  });

  it('turns a Prisma not-found error into 404', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: 'test',
    });

    filter.catch(err, host);

    expect(status).toHaveBeenCalledWith(404);
  });

  it('hides details of unexpected errors', () => {
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    filter.catch(new Error('database password leaked'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Internal server error' }),
    );
  });
});
