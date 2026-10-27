import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { setupApp } from './../src/setup-app';

/**
 * Needs the database running (docker compose up -d db) and migrated.
 * Creates users with random emails and deletes them at the end.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const email = `e2e-${randomUUID()}@test.local`;
  const password = 'Password1!';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await app.close();
  });

  it('rejects a request without token (401)', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('rejects invalid register data (400)', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: '123' })
      .expect(400);
  });

  it('register -> login -> me', async () => {
    const server = app.getHttpServer();

    const reg = await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Test' })
      .expect(201);
    expect((reg.body as { user: object }).user).not.toHaveProperty(
      'passwordHash',
    );

    await request(server)
      .post('/api/v1/auth/register')
      .send({ email, password, firstName: 'E2E', lastName: 'Test' })
      .expect(409);

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);
    const token = (login.body as { accessToken: string }).accessToken;

    const me = await request(server)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((me.body as { email: string }).email).toBe(email);
  });

  it('a VIEWER cannot list users (403)', async () => {
    const server = app.getHttpServer();
    await prisma.user.update({ where: { email }, data: { role: 'VIEWER' } });

    const login = await request(server)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    await request(server)
      .get('/api/v1/users')
      .set(
        'Authorization',
        `Bearer ${(login.body as { accessToken: string }).accessToken}`,
      )
      .expect(403);
  });
});
