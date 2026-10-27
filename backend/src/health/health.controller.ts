import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({
    description: "L'API répond",
    schema: {
      example: { status: 'ok', timestamp: '2026-10-27T10:00:00.000Z' },
    },
  })
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
