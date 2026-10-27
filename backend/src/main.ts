import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import morgan from 'morgan';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  setupApp(app);
  app.use(morgan('dev'));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('CloudOps Manager API')
    .setDescription('Projets, serveurs, applications, monitoring et alertes')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = Number(process.env.BACKEND_PORT ?? 3001);
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/api/v1`, 'Bootstrap');
  Logger.log(`Swagger: http://localhost:${port}/api/docs`, 'Bootstrap');
}

void bootstrap();
