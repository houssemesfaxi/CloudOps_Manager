import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ProjectRole, ProjectStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateProjectDto {
  @ApiProperty({ example: 'Boutique en ligne' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Site e-commerce et API de paiement' })
  @Transform(trim)
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;
}

export const PROJECT_SORT_FIELDS = ['createdAt', 'name', 'status'] as const;

/** GET /projects?search=shop&status=ACTIVE&memberId=... (RF-PRJ-5) */
export class ProjectsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Recherche dans le nom ou la description',
  })
  declare search?: string;

  @ApiPropertyOptional({ enum: PROJECT_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(PROJECT_SORT_FIELDS)
  declare sortBy?: (typeof PROJECT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ProjectStatus })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Projets dont cet utilisateur est membre',
  })
  @IsOptional()
  @IsUUID()
  memberId?: string;
}

/** POST /projects/:id/members (RF-PRJ-2) */
export class AddMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId: string;

  @ApiPropertyOptional({ enum: ProjectRole, default: ProjectRole.MEMBER })
  @IsOptional()
  @IsEnum(ProjectRole)
  projectRole?: ProjectRole;
}
