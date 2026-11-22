import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from '../projects/projects.service';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from './dto/environments.dto';

/** Sent with every environment: how many servers and applications it holds. */
const environmentInclude = {
  _count: { select: { servers: true, applications: true } },
} satisfies Prisma.EnvironmentInclude;

export type EnvironmentItem = Prisma.EnvironmentGetPayload<{
  include: typeof environmentInclude;
}>;

@Injectable()
export class EnvironmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projects: ProjectsService,
  ) {}

  /** A project has a few environments (dev, staging, prod): no pagination. */
  async findByProject(projectId: string): Promise<EnvironmentItem[]> {
    await this.projects.exists(projectId);
    return this.prisma.environment.findMany({
      where: { projectId },
      include: environmentInclude,
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    });
  }

  /** A name already used in the project gives 409 (HttpExceptionFilter). */
  async create(
    projectId: string,
    dto: CreateEnvironmentDto,
  ): Promise<EnvironmentItem> {
    await this.projects.exists(projectId);
    return this.prisma.environment.create({
      data: { ...dto, projectId },
      include: environmentInclude,
    });
  }

  async update(
    id: string,
    dto: UpdateEnvironmentDto,
  ): Promise<EnvironmentItem> {
    await this.findOne(id);
    return this.prisma.environment.update({
      where: { id },
      data: dto,
      include: environmentInclude,
    });
  }

  /** Refused while servers are attached to it (RESTRICT in the schema). */
  async remove(id: string): Promise<void> {
    const env = await this.findOne(id);
    if (env._count.servers > 0 || env._count.applications > 0) {
      throw new ConflictException(
        `L’environnement contient encore ${env._count.servers} serveur(s) : supprimez-les ou déplacez-les d’abord`,
      );
    }
    await this.prisma.environment.delete({ where: { id } });
  }

  private async findOne(id: string): Promise<EnvironmentItem> {
    const env = await this.prisma.environment.findUnique({
      where: { id },
      include: environmentInclude,
    });
    if (!env) {
      throw new NotFoundException('Environnement introuvable');
    }
    return env;
  }
}
