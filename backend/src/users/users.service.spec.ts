import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { plainToInstance } from 'class-transformer';
import { PrismaService } from '../prisma/prisma.service';
import { UsersQueryDto } from './dto/users.dto';
import { UsersService } from './users.service';

describe('UsersService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const service = new UsersService(prisma as unknown as PrismaService);

  beforeEach(() => jest.clearAllMocks());

  it('returns a paginated list', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: '1' }]);
    prisma.user.count.mockResolvedValue(11);

    const res = await service.findAll(
      plainToInstance(UsersQueryDto, { page: '2' }),
    );

    expect(res.meta).toEqual({ total: 11, page: 2, limit: 10, totalPages: 2 });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 }),
    );
  });

  it('throws 404 for an unknown user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findOne('x')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('prevents an admin from changing their own role', async () => {
    await expect(
      service.updateRole('me', Role.VIEWER, 'me'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('prevents an admin from deleting themselves', async () => {
    await expect(service.remove('me', 'me')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.delete).not.toHaveBeenCalled();
  });

  it('refuses a password change when the current password is wrong', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: '1',
      passwordHash: await bcrypt.hash('Right-password', 4),
    });

    await expect(
      service.changePassword('1', {
        currentPassword: 'Wrong-password',
        newPassword: 'NewPassword1!',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
