import { NotFoundException } from '@nestjs/common';
import { ServerStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServerDto,
  ServersQueryDto,
  UpdateServerDto,
} from './dto/servers.dto';
import { ServersService } from './servers.service';

describe('ServersService', () => {
  const prisma = {
    server: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    environment: { findUnique: jest.fn() },
  };
  const service = new ServersService(prisma as unknown as PrismaService);

  const dto: CreateServerDto = {
    environmentId: 'env-1',
    name: 'web-01',
    provider: 'AWS',
    region: 'eu-west-3',
    cpuCores: 2,
    ramGb: 4,
    storageGb: 80,
  };

  beforeEach(() => jest.clearAllMocks());

  it('applies filters, search and pagination', async () => {
    prisma.server.findMany.mockResolvedValue([{ id: '1' }]);
    prisma.server.count.mockResolvedValue(1);

    const res = await service.findAll(
      plainToInstance(ServersQueryDto, {
        search: '10.0',
        provider: 'aws',
        status: 'ACTIVE',
        projectId: 'p-1',
        sortBy: 'name',
        order: 'asc',
      }),
    );

    expect(res.meta).toEqual({ total: 1, page: 1, limit: 10, totalPages: 1 });
    expect(prisma.server.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: ServerStatus.ACTIVE,
          provider: { equals: 'aws', mode: 'insensitive' },
          environment: { projectId: 'p-1' },
          OR: [
            { name: { contains: '10.0', mode: 'insensitive' } },
            { ipAddress: { contains: '10.0' } },
          ],
        }) as unknown,
        orderBy: { name: 'asc' },
        skip: 0,
        take: 10,
      }),
    );
  });

  it('throws 404 for an unknown server', async () => {
    prisma.server.findUnique.mockResolvedValue(null);

    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to create a server in an unknown environment', async () => {
    prisma.environment.findUnique.mockResolvedValue(null);

    await expect(service.create(dto)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.server.create).not.toHaveBeenCalled();
  });

  it('creates a server in an existing environment', async () => {
    prisma.environment.findUnique.mockResolvedValue({ id: 'env-1' });
    prisma.server.create.mockResolvedValue({ id: 's-1', ...dto });

    await expect(service.create(dto)).resolves.toMatchObject({ id: 's-1' });
    expect(prisma.server.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: dto }),
    );
  });

  it('checks the new environment when moving a server', async () => {
    prisma.server.findUnique.mockResolvedValue({ id: 's-1' });
    prisma.environment.findUnique.mockResolvedValue(null);

    await expect(
      service.update('s-1', { environmentId: 'env-2' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.server.update).not.toHaveBeenCalled();
  });

  it('changes the status', async () => {
    prisma.server.findUnique.mockResolvedValue({ id: 's-1' });
    prisma.server.update.mockResolvedValue({
      id: 's-1',
      status: ServerStatus.MAINTENANCE,
    });

    await service.updateStatus('s-1', ServerStatus.MAINTENANCE);

    expect(prisma.server.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 's-1' },
        data: { status: ServerStatus.MAINTENANCE },
      }),
    );
  });

  it('does not delete an unknown server', async () => {
    prisma.server.findUnique.mockResolvedValue(null);

    await expect(service.remove('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.server.delete).not.toHaveBeenCalled();
  });
});

describe('Server DTOs', () => {
  it('rejects a bad IP and a CPU count of 0', async () => {
    const body = plainToInstance(CreateServerDto, {
      environmentId: '8f0c1d2e-3b4a-4c5d-8e6f-7a8b9c0d1e2f',
      name: 'web-01',
      provider: 'AWS',
      region: 'eu-west-3',
      cpuCores: 0,
      ramGb: 4,
      storageGb: 80,
      ipAddress: '999.1.1.1',
    });

    const errors = await validate(body);
    expect(errors.map((e) => e.property).sort()).toEqual([
      'cpuCores',
      'ipAddress',
    ]);
  });

  it('does not accept the status in the general update', async () => {
    const body = plainToInstance(UpdateServerDto, { status: 'STOPPED' });

    const errors = await validate(body, {
      forbidNonWhitelisted: true,
      whitelist: true,
    });
    expect(errors.map((e) => e.property)).toEqual(['status']);
  });
});
