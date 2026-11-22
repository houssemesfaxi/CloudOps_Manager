import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ApplicationStatus } from '@prisma/client';
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

/**
 * The environment is not sent: an application always takes the environment
 * of its server (docs/01: "une application est toujours liée à un serveur").
 */
export class CreateApplicationDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Serveur qui héberge l’application',
  })
  @IsUUID()
  serverId: string;

  @ApiProperty({ example: 'api-paiement' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: '1.4.2' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  version: string;

  @ApiPropertyOptional({
    enum: ApplicationStatus,
    default: ApplicationStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;
}

/** Every field is optional. Changing serverId moves the application. */
export class UpdateApplicationDto extends PartialType(CreateApplicationDto) {}

export const APPLICATION_SORT_FIELDS = [
  'createdAt',
  'name',
  'version',
  'status',
] as const;

/** GET /applications?search=api&status=RUNNING&serverId=...&projectId=... */
export class ApplicationsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Recherche dans le nom' })
  declare search?: string;

  @ApiPropertyOptional({ enum: APPLICATION_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(APPLICATION_SORT_FIELDS)
  declare sortBy?: (typeof APPLICATION_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ApplicationStatus })
  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: ApplicationStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  serverId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  environmentId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;
}
