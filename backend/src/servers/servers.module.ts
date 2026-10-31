import { Module } from '@nestjs/common';
import { ServersController } from './servers.controller';
import { ServersService } from './servers.service';

@Module({
  controllers: [ServersController],
  providers: [ServersService],
  // Used later by the applications, monitoring and dashboard modules.
  exports: [ServersService],
})
export class ServersModule {}
