import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import {
  CreateMetricDto,
  MetricsQueryDto,
  PeriodQueryDto,
} from './dto/monitoring.dto';
import { MonitoringService } from './monitoring.service';

/** Permissions: docs/01, section 4 (read: everyone, manual measure: Admin/DevOps). */
@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring/servers/:id')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('metrics')
  getMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: MetricsQueryDto,
  ) {
    return this.monitoringService.getMetrics(id, query);
  }

  @Get('latest')
  getLatest(@Param('id', ParseUUIDPipe) id: string) {
    return this.monitoringService.getLatest(id);
  }

  @Get('uptime')
  getUptime(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PeriodQueryDto,
  ) {
    return this.monitoringService.getUptime(id, query);
  }

  @Post('metrics')
  @Roles(Role.ADMIN, Role.DEVOPS)
  record(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CreateMetricDto) {
    return this.monitoringService.record(id, dto);
  }
}
