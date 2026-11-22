import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ProjectRole, ProjectStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto, ProjectsQueryDto } from './dto/projects.dto';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  const prisma = {
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    server: { count: jest.fn() },
  };
  const service = new ProjectsService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('filters by status, member and search', async () => {
    prisma.project.findMany.mockResolvedValue([]);
    prisma.project.count.mockResolvedValue(0);

    await service.findAll(
      plainToInstance(ProjectsQueryDto, {
        status: 'ARCHIVED',
        memberId: 'u-1',
        search: 'shop',
        sortBy: 'name',
        order: 'asc',
      }),
    );

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: ProjectStatus.ARCHIVED,
          members: { some: { userId: 'u-1' } },
          OR: [
            { name: { contains: 'shop', mode: 'insensitive' } },
            { description: { contains: 'shop', mode: 'insensitive' } },
          ],
        },
        orderBy: { name: 'asc' },
      }),
    );
  });

  it('makes the creator the OWNER of the new project', async () => {
    prisma.project.create.mockResolvedValue({ id: 'p-1' });

    await service.create({ name: 'Shop' }, 'u-1');

    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Shop',
          createdById: 'u-1',
          members: {
            create: { userId: 'u-1', projectRole: ProjectRole.OWNER },
          },
        },
      }),
    );
  });

  it('throws 404 for an unknown project', async () => {
    prisma.project.findUnique.mockResolvedValue(null);

    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.update('x', { name: 'a' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('refuses to delete a project that still has servers', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
    prisma.server.count.mockResolvedValue(2);

    await expect(service.remove('p-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.project.delete).not.toHaveBeenCalled();
  });

  it('deletes a project without servers', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
    prisma.server.count.mockResolvedValue(0);

    await service.remove('p-1');

    expect(prisma.project.delete).toHaveBeenCalledWith({
      where: { id: 'p-1' },
    });
  });

  it('returns 404 when adding an unknown user', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'p-1' });
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.addMember('p-1', { userId: 'u-x' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.projectMember.create).not.toHaveBeenCalled();
  });

  it('keeps at least one owner', async () => {
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'm-1',
      projectRole: ProjectRole.OWNER,
    });
    prisma.projectMember.count.mockResolvedValue(1);

    await expect(service.removeMember('p-1', 'u-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.projectMember.delete).not.toHaveBeenCalled();
  });

  it('removes a simple member', async () => {
    prisma.projectMember.findUnique.mockResolvedValue({
      id: 'm-2',
      projectRole: ProjectRole.MEMBER,
    });

    await service.removeMember('p-1', 'u-2');

    expect(prisma.projectMember.delete).toHaveBeenCalledWith({
      where: { id: 'm-2' },
    });
  });

  it('returns 404 when removing someone who is not a member', async () => {
    prisma.projectMember.findUnique.mockResolvedValue(null);

    await expect(service.removeMember('p-1', 'u-9')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('Project DTOs', () => {
  it('rejects an empty name and trims it', async () => {
    const bad = plainToInstance(CreateProjectDto, { name: '   ' });
    expect((await validate(bad)).map((e) => e.property)).toEqual(['name']);

    const ok = plainToInstance(CreateProjectDto, { name: '  Shop ' });
    expect(await validate(ok)).toHaveLength(0);
    expect(ok.name).toBe('Shop');
  });
});
