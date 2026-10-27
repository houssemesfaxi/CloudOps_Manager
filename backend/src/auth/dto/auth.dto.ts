import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const toLowerTrim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'admin@cloudops.local' })
  @Transform(toLowerTrim)
  @IsEmail()
  email: string;

  @ApiProperty({ minLength: 8, example: 'Admin123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignores anything after 72 bytes
  password: string;

  @ApiProperty({ example: 'Houssem' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  firstName: string;

  @ApiProperty({ example: 'Ben Ali' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  lastName: string;
}

export class LoginDto {
  @ApiProperty({ example: 'admin@cloudops.local' })
  @Transform(toLowerTrim)
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
