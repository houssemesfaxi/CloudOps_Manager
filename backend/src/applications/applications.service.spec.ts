import { NotFoundException } from '@nestjs/common';
import { ApplicationStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationsService } from './applications.service';
import {
  ApplicationsQueryDto,
  CreateApplicationDto,
} from './dto/applications.dto';

describe('ApplicationsService', () => {
  const prisma = {
    application: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    server: { findUnique: jest.fn() },
  };
  const service = new ApplicationsService(prisma as unknown as PrismaService);

  const dto: CreateApplicationDto = {
    serverId: 's-1',
    name: 'api-paiement',
    version: '1.0.0',
  };

  beforeEach(() => jest.clearAllMocks());

  it('applies filters, search and pagination', async () => {
    prisma.application.findMany.mockResolvedValue([{ id: 'a-1' }]);
    prisma.application.count.mockResolvedValue(11);

    const res = await service.findAll(
      plainToInstance(ApplicationsQueryDto, {
        search: 'api',
        status: 'FAILED',
        projectId: 'p-1',
        sortBy: 'version',
        page: '2',
      }),
    );

    expect(res.meta).toEqual({ total: 11, page: 2, limit: 10, totalPages: 2 });
    expect(prisma.application.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ApplicationStatus.FAILED,
          environment: { projectId: 'p-1' },
          name: { contains: 'api', mode: 'insensitive' },
        }) as unknown,
        orderBy: { version: 'desc' },
        skip: 10,
        take: 10,
      }),
    );
  });

  it('throws 404 for an unknown application', async () => {
    prisma.application.findUnique.mockResolvedValue(null);

    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses an application on an unknown server', async () => {
    prisma.server.findUnique.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.create).not.toHaveBeenCalled();
  });

  it('takes the environment of its server', async () => {
    prisma.server.findUnique.mockResolvedValue({ environmentId: 'env-1' });
    prisma.application.create.mockResolvedValue({ id: 'a-1' });

    await service.create(dto);

    expect(prisma.application.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...dto, environmentId: 'env-1' },
      }),
    );
  });

  it('changes environment when moved to another server', async () => {
    prisma.application.findUnique.mockResolvedValue({ id: 'a-1' });
    prisma.server.findUnique.mockResolvedValue({ environmentId: 'env-2' });
    prisma.application.update.mockResolvedValue({ id: 'a-1' });

    await service.update('a-1', { serverId: 's-2' });

    expect(prisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { serverId: 's-2', environmentId: 'env-2' },
      }),
    );
  });

  it('updates the version without touching the server', async () => {
    prisma.application.findUnique.mockResolvedValue({ id: 'a-1' });
    prisma.application.update.mockResolvedValue({ id: 'a-1' });

    await service.update('a-1', { version: '2.0.0' });

    expect(prisma.server.findUnique).not.toHaveBeenCalled();
    expect(prisma.application.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { version: '2.0.0' } }),
    );
  });

  it('does not delete an unknown application', async () => {
    prisma.application.findUnique.mockResolvedValue(null);

    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.application.delete).not.toHaveBeenCalled();
  });
});

describe('Application DTOs', () => {
  it('rejects an empty name, a bad server id and a bad status', async () => {
    const body = plainToInstance(CreateApplicationDto, {
      serverId: 'not-a-uuid',
      name: '   ',
      version: '1.0.0',
      status: 'CRASHED',
    });

    const errors = await validate(body);
    expect(errors.map((e) => e.property).sort()).toEqual([
      'name',
      'serverId',
      'status',
    ]);
  });

  it('does not accept an environment id', async () => {
    const body = plainToInstance(CreateApplicationDto, {
      serverId: '8f0c1d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f',
      name: 'api',
      version: '1.0.0',
      environmentId: '8f0c1d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f',
    });

    const errors = await validate(body, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((e) => e.property)).toEqual(['environmentId']);
  });
});
