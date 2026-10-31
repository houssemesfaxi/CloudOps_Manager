import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { setupApp } from './../src/setup-app';

/**
 * Needs the database running (docker compose up -d db) and migrated.
 * Creates its own users, project and environment, and deletes them at the end.
 */
describe('Servers (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tag = randomUUID().slice(0, 8);
  const password = 'Password1!';
  const tokens: Partial<Record<Role, string>> = {};
  let projectId: string;
  let environmentId: string;
  let serverId: string;

  const http = () => request(app.getHttpServer());
  const auth = (role: Role) => ({ Authorization: `Bearer ${tokens[role]}` });

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 4);
    for (const role of [Role.ADMIN, Role.DEVOPS, Role.VIEWER]) {
      const email = `e2e-srv-${role.toLowerCase()}-${tag}@test.local`;
      await prisma.user.create({
        data: { email, passwordHash, firstName: 'E2E', lastName: role, role },
      });
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
      tokens[role] = (res.body as { accessToken: string }).accessToken;
    }

    const admin = await prisma.user.findFirstOrThrow({
      where: { email: `e2e-srv-admin-${tag}@test.local` },
    });
    const project = await prisma.project.create({
      data: { name: `e2e-${tag}`, createdById: admin.id },
    });
    projectId = project.id;
    const env = await prisma.environment.create({
      data: { projectId, type: 'DEV', name: 'dev' },
    });
    environmentId = env.id;
  });

  afterAll(async () => {
    // Servers block the environment from being deleted (RESTRICT), so they go first.
    await prisma.server.deleteMany({ where: { environmentId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag}@test.local` } },
    });
    await app.close();
  });

  const body = () => ({
    environmentId,
    name: 'web-01',
    provider: 'AWS',
    region: 'eu-west-3',
    cpuCores: 2,
    ramGb: 4,
    storageGb: 80,
    ipAddress: '10.0.0.12',
  });

  it('rejects a request without token (401)', () => {
    return http().get('/api/v1/servers').expect(401);
  });

  it('a VIEWER cannot create a server (403)', () => {
    return http()
      .post('/api/v1/servers')
      .set(auth(Role.VIEWER))
      .send(body())
      .expect(403);
  });

  it('rejects invalid data (400)', () => {
    return http()
      .post('/api/v1/servers')
      .set(auth(Role.DEVOPS))
      .send({ ...body(), cpuCores: 0, ipAddress: 'abc' })
      .expect(400);
  });

  it('returns 404 for an unknown environment', () => {
    return http()
      .post('/api/v1/servers')
      .set(auth(Role.DEVOPS))
      .send({ ...body(), environmentId: randomUUID() })
      .expect(404);
  });

  it('a DEVOPS creates a server, a duplicate name gives 409', async () => {
    const res = await http()
      .post('/api/v1/servers')
      .set(auth(Role.DEVOPS))
      .send(body())
      .expect(201);
    const server = res.body as {
      id: string;
      status: string;
      environment: { project: { id: string } };
    };
    serverId = server.id;
    expect(server.status).toBe('ACTIVE');
    expect(server.environment.project.id).toBe(projectId);

    await http()
      .post('/api/v1/servers')
      .set(auth(Role.DEVOPS))
      .send(body())
      .expect(409);
  });

  it('a VIEWER lists and filters servers', async () => {
    const res = await http()
      .get('/api/v1/servers')
      .query({ projectId, search: '10.0.0', provider: 'aws' })
      .set(auth(Role.VIEWER))
      .expect(200);
    const list = res.body as { data: { id: string }[]; meta: object };
    expect(list.data.map((s) => s.id)).toEqual([serverId]);
    expect(list.meta).toMatchObject({ total: 1, page: 1 });

    await http()
      .get(`/api/v1/servers/${serverId}`)
      .set(auth(Role.VIEWER))
      .expect(200);
  });

  it('updates the server and its status', async () => {
    const upd = await http()
      .patch(`/api/v1/servers/${serverId}`)
      .set(auth(Role.DEVOPS))
      .send({ ramGb: 8 })
      .expect(200);
    expect((upd.body as { ramGb: number }).ramGb).toBe(8);

    const st = await http()
      .patch(`/api/v1/servers/${serverId}/status`)
      .set(auth(Role.DEVOPS))
      .send({ status: 'MAINTENANCE' })
      .expect(200);
    expect((st.body as { status: string }).status).toBe('MAINTENANCE');
  });

  it('only an ADMIN can delete a server', async () => {
    await http()
      .delete(`/api/v1/servers/${serverId}`)
      .set(auth(Role.DEVOPS))
      .expect(403);

    await http()
      .delete(`/api/v1/servers/${serverId}`)
      .set(auth(Role.ADMIN))
      .expect(204);

    await http()
      .get(`/api/v1/servers/${serverId}`)
      .set(auth(Role.ADMIN))
      .expect(404);
  });
});
