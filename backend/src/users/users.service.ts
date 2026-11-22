import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import {
  paginate,
  PaginatedResponse,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangePasswordDto,
  UpdateProfileDto,
  UsersQueryDto,
} from './dto/users.dto';
import { PublicUser, publicUserSelect } from './user.select';

export const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: UsersQueryDto): Promise<PaginatedResponse<PublicUser>> {
    const where: Prisma.UserWhereInput = {
      role: query.role,
      isActive: query.isActive,
      ...(query.search && {
        OR: [
          { email: { contains: query.search, mode: 'insensitive' } },
          { firstName: { contains: query.search, mode: 'insensitive' } },
          { lastName: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: { [query.sortBy ?? 'createdAt']: query.order },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return paginate(rows, total, query);
  }

  async findOne(id: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return user;
  }

  async updateRole(
    id: string,
    role: Role,
    currentUserId: string,
  ): Promise<PublicUser> {
    this.refuseSelf(id, currentUserId, 'modifier votre propre rôle');
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { role },
      select: publicUserSelect,
    });
  }

  async updateStatus(
    id: string,
    isActive: boolean,
    currentUserId: string,
  ): Promise<PublicUser> {
    this.refuseSelf(id, currentUserId, 'désactiver votre propre compte');
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: publicUserSelect,
    });
  }

  /** Fails with 409 if the user still owns projects (see HttpExceptionFilter). */
  async remove(id: string, currentUserId: string): Promise<void> {
    this.refuseSelf(id, currentUserId, 'supprimer votre propre compte');
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }

  updateProfile(userId: string, dto: UpdateProfileDto): Promise<PublicUser> {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: publicUserSelect,
    });
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (
      !user ||
      !(await bcrypt.compare(dto.currentPassword, user.passwordHash))
    ) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS) },
    });
  }

  /** An admin must not lock themselves out by mistake. */
  private refuseSelf(id: string, currentUserId: string, action: string): void {
    if (id === currentUserId) {
      throw new BadRequestException(`Vous ne pouvez pas ${action}`);
    }
  }
}
