import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { setupApp } from './../src/setup-app';

describe('App (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns ok', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toMatchObject({ status: 'ok' });
      });
  });

  it('unknown route returns the standard error format', () => {
    return request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404)
      .expect((res) => {
        expect(res.body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          path: '/api/v1/does-not-exist',
        });
        expect(res.body).toHaveProperty('timestamp');
      });
  });
});
