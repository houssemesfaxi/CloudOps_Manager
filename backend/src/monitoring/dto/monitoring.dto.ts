import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

/** POST /monitoring/servers/:id/metrics (manual measure, Admin/DevOps). */
export class CreateMetricDto {
  @ApiProperty({ example: 42.5, minimum: 0, maximum: 100, description: '%' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  cpuUsage: number;

  @ApiProperty({ example: 61, minimum: 0, maximum: 100, description: '%' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  ramUsage: number;

  @ApiPropertyOptional({ default: true, description: 'Serveur joignable ?' })
  @IsOptional()
  @IsBoolean()
  isUp?: boolean;
}

/** ?from=2026-11-22T08:00:00Z&to=2026-11-22T09:00:00Z (ISO 8601). */
export class PeriodQueryDto {
  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  from?: Date;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    description: 'Par défaut : maintenant',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  to?: Date;
}

/** GET /monitoring/servers/:id/metrics: last hour by default. */
export class MetricsQueryDto extends PeriodQueryDto {
  @ApiPropertyOptional({
    default: 500,
    minimum: 1,
    maximum: 2000,
    description: 'Nombre maximum de points (les plus récents de la période)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(2000)
  limit: number = 500;
}
