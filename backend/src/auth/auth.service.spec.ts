import { ConflictException, ForbiddenException } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

type CreateArgs = { data: { role: Role; passwordHash: string } };

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      count: jest.fn(),
      create: jest.fn((args: CreateArgs) =>
        Promise.resolve({ id: 'new-id', ...args.data }),
      ),
    },
  };
  const jwt = { signAsync: jest.fn().mockResolvedValue('token') };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    jwt as unknown as JwtService,
  );

  const registerDto = {
    email: 'a@b.com',
    password: 'Password1!',
    firstName: 'A',
    lastName: 'B',
  };

  beforeEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('makes the first user ADMIN and hashes the password', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(0);

      const res = await service.register(registerDto);

      const data = prisma.user.create.mock.calls[0][0].data;
      expect(data.role).toBe(Role.ADMIN);
      expect(data.passwordHash).not.toBe(registerDto.password);
      expect(res.accessToken).toBe('token');
    });

    it('makes later users VIEWER', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.count.mockResolvedValue(3);

      await service.register(registerDto);

      expect(prisma.user.create.mock.calls[0][0].data.role).toBe(Role.VIEWER);
    });

    it('refuses an email already used', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: '1' });

      await expect(service.register(registerDto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('login', () => {
    const storedUser = async (isActive = true) => ({
      id: '1',
      email: 'a@b.com',
      passwordHash: await bcrypt.hash('Password1!', 4),
      role: Role.DEVOPS,
      isActive,
    });

    it('returns a token and never the password hash', async () => {
      prisma.user.findUnique.mockResolvedValue(await storedUser());

      const res = await service.login({
        email: 'a@b.com',
        password: 'Password1!',
      });

      expect(res.accessToken).toBe('token');
      expect(res.user).not.toHaveProperty('passwordHash');
      expect(jwt.signAsync).toHaveBeenCalledWith({
        sub: '1',
        email: 'a@b.com',
        role: Role.DEVOPS,
      });
    });

    it('rejects a wrong password with 401', async () => {
      prisma.user.findUnique.mockResolvedValue(await storedUser());

      await expect(
        service.login({ email: 'a@b.com', password: 'wrong-password' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a deactivated account with 403', async () => {
      prisma.user.findUnique.mockResolvedValue(await storedUser(false));

      await expect(
        service.login({ email: 'a@b.com', password: 'Password1!' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });
});
