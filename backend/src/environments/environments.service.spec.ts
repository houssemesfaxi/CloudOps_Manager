import { ConflictException, NotFoundException } from '@nestjs/common';
import { EnvironmentType } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateEnvironmentDto } from './dto/environments.dto';
import { EnvironmentsService } from './environments.service';

describe('EnvironmentsService', () => {
  const prisma = {
    environment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const projects = { exists: jest.fn() };
  const service = new EnvironmentsService(
    prisma as unknown as PrismaService,
    projects as unknown as ProjectsService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('does not create an environment in an unknown project', async () => {
    projects.exists.mockRejectedValue(new NotFoundException());

    await expect(
      service.create('p-x', { type: EnvironmentType.DEV, name: 'dev' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.environment.create).not.toHaveBeenCalled();
  });

  it('creates an environment in the project', async () => {
    projects.exists.mockResolvedValue(undefined);
    prisma.environment.create.mockResolvedValue({ id: 'e-1' });

    await service.create('p-1', { type: EnvironmentType.PROD, name: 'prod' });

    expect(prisma.environment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { type: EnvironmentType.PROD, name: 'prod', projectId: 'p-1' },
      }),
    );
  });

  it('refuses to delete an environment that still has servers', async () => {
    prisma.environment.findUnique.mockResolvedValue({
      id: 'e-1',
      _count: { servers: 1, applications: 0 },
    });

    await expect(service.remove('e-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.environment.delete).not.toHaveBeenCalled();
  });

  it('deletes an empty environment', async () => {
    prisma.environment.findUnique.mockResolvedValue({
      id: 'e-1',
      _count: { servers: 0, applications: 0 },
    });

    await service.remove('e-1');

    expect(prisma.environment.delete).toHaveBeenCalledWith({
      where: { id: 'e-1' },
    });
  });

  it('throws 404 when updating an unknown environment', async () => {
    prisma.environment.findUnique.mockResolvedValue(null);

    await expect(service.update('x', { name: 'a' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('Environment DTOs', () => {
  it('rejects an unknown type', async () => {
    const body = plainToInstance(CreateEnvironmentDto, {
      type: 'TEST',
      name: 'test',
    });
    expect((await validate(body)).map((e) => e.property)).toEqual(['type']);
  });
});
