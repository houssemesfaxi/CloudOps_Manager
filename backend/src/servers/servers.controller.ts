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
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateServerDto,
  ServersQueryDto,
  UpdateServerDto,
  UpdateServerStatusDto,
} from './dto/servers.dto';
import { ServersService } from './servers.service';

/** Permissions: docs/01, section 4 (read: everyone, write: Admin/DevOps, delete: Admin). */
@ApiTags('Servers')
@ApiBearerAuth()
@Controller('servers')
export class ServersController {
  constructor(private readonly serversService: ServersService) {}

  @Get()
  findAll(@Query() query: ServersQueryDto) {
    return this.serversService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DEVOPS)
  create(@Body() dto: CreateServerDto) {
    return this.serversService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN, Role.DEVOPS)
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServerDto) {
    return this.serversService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.DEVOPS)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateServerStatusDto,
  ) {
    return this.serversService.updateStatus(id, dto.status);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.serversService.remove(id);
  }
}
