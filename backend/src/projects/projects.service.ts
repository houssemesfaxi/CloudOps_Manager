import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProjectRole } from '@prisma/client';
import {
  paginate,
  PaginatedResponse,
} from '../common/dto/paginated-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddMemberDto,
  CreateProjectDto,
  ProjectsQueryDto,
  UpdateProjectDto,
} from './dto/projects.dto';
import {
  memberSelect,
  ProjectDetail,
  projectDetailInclude,
  projectListInclude,
  ProjectListItem,
  ProjectMemberItem,
} from './project.select';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: ProjectsQueryDto,
  ): Promise<PaginatedResponse<ProjectListItem>> {
    const where: Prisma.ProjectWhereInput = {
      status: query.status,
      ...(query.memberId && {
        members: { some: { userId: query.memberId } },
      }),
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: 'insensitive' } },
          { description: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [rows, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: projectListInclude,
        orderBy: { [query.sortBy ?? 'createdAt']: query.order },
        skip: query.skip,
        take: query.limit,
      }),
      this.prisma.project.count({ where }),
    ]);
    return paginate(rows, total, query);
  }

  async findOne(id: string): Promise<ProjectDetail> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: projectDetailInclude,
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
    return project;
  }

  /** The creator becomes the first OWNER of the project. */
  async create(dto: CreateProjectDto, userId: string): Promise<ProjectDetail> {
    return this.prisma.project.create({
      data: {
        ...dto,
        createdById: userId,
        members: { create: { userId, projectRole: ProjectRole.OWNER } },
      },
      include: projectDetailInclude,
    });
  }

  async update(id: string, dto: UpdateProjectDto): Promise<ProjectDetail> {
    await this.exists(id);
    return this.prisma.project.update({
      where: { id },
      data: dto,
      include: projectDetailInclude,
    });
  }

  /**
   * Deletes the project with its environments and members (cascade).
   * Refused while servers are still attached to it: they must be deleted
   * or moved first (an environment with servers cannot be deleted).
   */
  async remove(id: string): Promise<void> {
    await this.exists(id);
    const servers = await this.prisma.server.count({
      where: { environment: { projectId: id } },
    });
    if (servers > 0) {
      throw new ConflictException(
        `Le projet a encore ${servers} serveur(s) : supprimez-les ou déplacez-les d’abord`,
      );
    }
    await this.prisma.project.delete({ where: { id } });
  }

  // --- Team (RF-PRJ-2) ---

  /** Already a member -> 409 (unique userId + projectId). */
  async addMember(
    projectId: string,
    dto: AddMemberDto,
  ): Promise<ProjectMemberItem> {
    await this.exists(projectId);
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      select: { id: true },
    });
    if (!user) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    return this.prisma.projectMember.create({
      data: { projectId, ...dto },
      select: memberSelect,
    });
  }

  /** A project always keeps at least one OWNER. */
  async removeMember(projectId: string, userId: string): Promise<void> {
    const member = await this.prisma.projectMember.findUnique({
      where: { userId_projectId: { userId, projectId } },
    });
    if (!member) {
      throw new NotFoundException('Ce membre ne fait pas partie du projet');
    }
    if (member.projectRole === ProjectRole.OWNER) {
      const owners = await this.prisma.projectMember.count({
        where: { projectId, projectRole: ProjectRole.OWNER },
      });
      if (owners <= 1) {
        throw new BadRequestException(
          'Le projet doit garder au moins un propriétaire',
        );
      }
    }
    await this.prisma.projectMember.delete({ where: { id: member.id } });
  }

  /** 404 if the project does not exist. Used by the environments module too. */
  async exists(id: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!project) {
      throw new NotFoundException('Projet introuvable');
    }
  }
}
