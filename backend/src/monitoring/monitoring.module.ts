import { Module } from '@nestjs/common';
import { MetricsScheduler } from './metrics.scheduler';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, MetricsScheduler],
  // Used later by the alerts (step 16) and dashboard modules.
  exports: [MonitoringService],
})
export class MonitoringModule {}
