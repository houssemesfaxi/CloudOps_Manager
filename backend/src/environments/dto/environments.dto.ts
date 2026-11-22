import { ApiProperty, PartialType } from '@nestjs/swagger';
import { EnvironmentType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsEnum, IsNotEmpty, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/** POST /projects/:id/environments (RF-PRJ-3). The name is unique in a project. */
export class CreateEnvironmentDto {
  @ApiProperty({ enum: EnvironmentType, example: EnvironmentType.PROD })
  @IsEnum(EnvironmentType)
  type: EnvironmentType;

  @ApiProperty({ example: 'prod-europe' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;
}

export class UpdateEnvironmentDto extends PartialType(CreateEnvironmentDto) {}
