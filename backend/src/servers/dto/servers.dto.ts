import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { ServerStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsIP,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateServerDto {
  @ApiProperty({ format: 'uuid', description: 'Environnement du serveur' })
  @IsUUID()
  environmentId: string;

  @ApiProperty({ example: 'web-prod-01' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'AWS', description: 'AWS, Azure, GCP, OVH...' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  provider: string;

  @ApiProperty({ example: 'eu-west-3' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  region: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 256 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(256)
  cpuCores: number;

  @ApiProperty({ example: 4, minimum: 1, maximum: 4096 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(4096)
  ramGb: number;

  @ApiProperty({ example: 80, minimum: 1, maximum: 100000 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100000)
  storageGb: number;

  @ApiPropertyOptional({ example: '10.0.0.12', description: 'IPv4 ou IPv6' })
  @IsOptional()
  @IsIP()
  ipAddress?: string;

  @ApiPropertyOptional({ enum: ServerStatus, default: ServerStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;
}

/** Every field is optional. The status has its own route (PATCH /servers/:id/status). */
export class UpdateServerDto extends PartialType(
  OmitType(CreateServerDto, ['status'] as const),
) {}

export class UpdateServerStatusDto {
  @ApiProperty({ enum: ServerStatus })
  @IsEnum(ServerStatus)
  status: ServerStatus;
}

export const SERVER_SORT_FIELDS = [
  'createdAt',
  'name',
  'provider',
  'region',
  'status',
] as const;

/** GET /servers?search=web&provider=AWS&status=ACTIVE&projectId=... */
export class ServersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Recherche dans le nom ou l’IP' })
  declare search?: string;

  @ApiPropertyOptional({ enum: SERVER_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(SERVER_SORT_FIELDS)
  declare sortBy?: (typeof SERVER_SORT_FIELDS)[number];

  @ApiPropertyOptional({ example: 'AWS' })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({ example: 'eu-west-3' })
  @IsOptional()
  @IsString()
  region?: string;

  @ApiPropertyOptional({ enum: ServerStatus })
  @IsOptional()
  @IsEnum(ServerStatus)
  status?: ServerStatus;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  environmentId?: string;
}
