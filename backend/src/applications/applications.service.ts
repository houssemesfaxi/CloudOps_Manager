import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  paginate,
  PaginatedResponse,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationsQueryDto,
  CreateApplicationDto,
  UpdateApplicationDto,
} from './dto/applications.dto';
import {
  applicationInclude,
  ApplicationWithRelations,
} from './application.select';

@Injectable()
export class ApplicationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ApplicationsQueryDto,
  ): Promise<PaginatedResponse<ApplicationWithRelations>> {
    const where: Prisma.ApplicationWhereInput = {
      status: query.status,
      serverId: query.serverId,
      environmentId: query.environmentId,
      ...(query.projectId && {
        environment: { projectId: query.projectId },
      }),
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' },
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.application.findMany({
        where,
        include: applicationInclude,
        orderBy: { [query.sortBy ?? 'createdAt']: query.order },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.application.count({ where }),
    ]);
    return paginate(rows, total, query);
  }

  async findOne(id: string): Promise<ApplicationWithRelations> {
    const app = await this.prisma.application.findUnique({
      where: { id },
      include: applicationInclude,
    });
    if (!app) {
      throw new NotFoundException('Application introuvable');
    }
    return app;
  }

  /** A name already used on the same server gives 409 (HttpExceptionFilter). */
  async create(dto: CreateApplicationDto): Promise<ApplicationWithRelations> {
    const environmentId = await this.environmentOfServer(dto.serverId);
    return this.prisma.application.create({
      data: { ...dto, environmentId },
      include: applicationInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateApplicationDto,
  ): Promise<ApplicationWithRelations> {
    await this.findOne(id);
    const data: Prisma.ApplicationUncheckedUpdateInput = { ...dto };
    if (dto.serverId) {
      // Moving to another server also moves the application to its environment.
      data.environmentId = await this.environmentOfServer(dto.serverId);
    }
    return this.prisma.application.update({
      where: { id },
      data,
      include: applicationInclude,
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.application.delete({ where: { id } });
  }

  private async environmentOfServer(serverId: string): Promise<string> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { environmentId: true },
    });
    if (!server) {
      throw new NotFoundException('Serveur introuvable');
    }
    return server.environmentId;
  }
}
