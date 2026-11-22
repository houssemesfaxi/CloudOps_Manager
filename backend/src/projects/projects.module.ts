import { Module } from '@nestjs/common';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  controllers: [ProjectsController],
  providers: [ProjectsService],
  // Used by the environments module (and the dashboard later).
  exports: [ProjectsService],
})
export class ProjectsModule {}
