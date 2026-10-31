import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ServerStatus } from '@prisma/client';
import {
  paginate,
  PaginatedResponse,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateServerDto,
  ServersQueryDto,
  UpdateServerDto,
} from './dto/servers.dto';
import { serverInclude, ServerWithRelations } from './server.select';

@Injectable()
export class ServersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ServersQueryDto,
  ): Promise<PaginatedResponse<ServerWithRelations>> {
    const where: Prisma.ServerWhereInput = {
      status: query.status,
      environmentId: query.environmentId,
      ...(query.provider && {
        provider: { equals: query.provider, mode: 'insensitive' },
      }),
      ...(query.region && {
        region: { equals: query.region, mode: 'insensitive' },
      }),
      ...(query.projectId && {
        environment: { projectId: query.projectId },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { ipAddress: { contains: query.search } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.server.findMany({
        where,
        include: serverInclude,
        orderBy: { [query.sortBy ?? 'createdAt']: query.order },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.server.count({ where }),
    ]);
    return paginate(rows, total, query);
  }

  async findOne(id: string): Promise<ServerWithRelations> {
    const server = await this.prisma.server.findUnique({
      where: { id },
      include: serverInclude,
    });
    if (!server) {
      throw new NotFoundException('Serveur introuvable');
    }
    return server;
  }

  /** A name already used in the same environment gives 409 (HttpExceptionFilter). */
  async create(dto: CreateServerDto): Promise<ServerWithRelations> {
    await this.checkEnvironment(dto.environmentId);
    return this.prisma.server.create({ data: dto, include: serverInclude });
  }

  async update(id: string, dto: UpdateServerDto): Promise<ServerWithRelations> {
    await this.findOne(id);
    if (dto.environmentId) {
      await this.checkEnvironment(dto.environmentId);
    }
    return this.prisma.server.update({
      where: { id },
      data: dto,
      include: serverInclude,
    });
  }

  async updateStatus(
    id: string,
    status: ServerStatus,
  ): Promise<ServerWithRelations> {
    await this.findOne(id);
    return this.prisma.server.update({
      where: { id },
      data: { status },
      include: serverInclude,
    });
  }

  /** Also deletes the server's applications, metrics, alert rules and alerts (cascade). */
  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.server.delete({ where: { id } });
  }

  private async checkEnvironment(environmentId: string): Promise<void> {
    const env = await this.prisma.environment.findUnique({
      where: { id: environmentId },
      select: { id: true },
    });
    if (!env) {
      throw new NotFoundException('Environnement introuvable');
    }
  }
}
