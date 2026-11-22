import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateEnvironmentDto,
  UpdateEnvironmentDto,
} from './dto/environments.dto';
import { EnvironmentsService } from './environments.service';

/**
 * Routes from docs/03: list and create under the project,
 * update and delete directly on the environment.
 */
@ApiTags('Environments')
@ApiBearerAuth()
@Controller()
export class EnvironmentsController {
  constructor(private readonly environmentsService: EnvironmentsService) {}

  @Get('projects/:id/environments')
  findByProject(@Param('id', ParseUUIDPipe) projectId: string) {
    return this.environmentsService.findByProject(projectId);
  }

  @Post('projects/:id/environments')
  @Roles(Role.ADMIN, Role.DEVOPS)
  create(
    @Param('id', ParseUUIDPipe) projectId: string,
    @Body() dto: CreateEnvironmentDto,
  ) {
    return this.environmentsService.create(projectId, dto);
  }

  @Patch('environments/:id')
  @Roles(Role.ADMIN, Role.DEVOPS)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEnvironmentDto,
  ) {
    return this.environmentsService.update(id, dto);
  }

  @Delete('environments/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.environmentsService.remove(id);
  }
}
