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
 * Creates its own users, project, environments and servers, and deletes them at the end.
 */
describe('Applications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tag = randomUUID().slice(0, 8);
  const password = 'Password1!';
  const tokens: Partial<Record<Role, string>> = {};
  let projectId: string;
  let devEnvId: string;
  let prodEnvId: string;
  let devServerId: string;
  let prodServerId: string;
  let appId: string;

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
      const email = `e2e-app-${role.toLowerCase()}-${tag}@test.local`;
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
      where: { email: `e2e-app-admin-${tag}@test.local` },
    });
    const project = await prisma.project.create({
      data: { name: `e2e-${tag}`, createdById: admin.id },
    });
    projectId = project.id;

    const server = {
      provider: 'AWS',
      region: 'eu-west-3',
      cpuCores: 2,
      ramGb: 4,
      storageGb: 80,
    };
    const dev = await prisma.environment.create({
      data: { projectId, type: 'DEV', name: 'dev' },
    });
    const prod = await prisma.environment.create({
      data: { projectId, type: 'PROD', name: 'prod' },
    });
    devEnvId = dev.id;
    prodEnvId = prod.id;
    devServerId = (
      await prisma.server.create({
        data: { ...server, name: 'web-dev', environmentId: devEnvId },
      })
    ).id;
    prodServerId = (
      await prisma.server.create({
        data: { ...server, name: 'web-prod', environmentId: prodEnvId },
      })
    ).id;
  });

  afterAll(async () => {
    // Deleting the servers deletes their applications (cascade).
    await prisma.server.deleteMany({
      where: { id: { in: [devServerId, prodServerId] } },
    });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag}@test.local` } },
    });
    await app.close();
  });

  const body = () => ({
    serverId: devServerId,
    name: 'api-paiement',
    version: '1.0.0',
  });

  it('rejects a request without token (401)', () => {
    return http().get('/api/v1/applications').expect(401);
  });

  it('a VIEWER cannot create an application (403)', () => {
    return http()
      .post('/api/v1/applications')
      .set(auth(Role.VIEWER))
      .send(body())
      .expect(403);
  });

  it('rejects invalid data (400)', () => {
    return http()
      .post('/api/v1/applications')
      .set(auth(Role.DEVOPS))
      .send({ ...body(), version: '', status: 'CRASHED' })
      .expect(400);
  });

  it('returns 404 for an unknown server', () => {
    return http()
      .post('/api/v1/applications')
      .set(auth(Role.DEVOPS))
      .send({ ...body(), serverId: randomUUID() })
      .expect(404);
  });

  it('a DEVOPS creates an application, a duplicate name gives 409', async () => {
    const res = await http()
      .post('/api/v1/applications')
      .set(auth(Role.DEVOPS))
      .send(body())
      .expect(201);
    const created = res.body as {
      id: string;
      status: string;
      environment: { id: string; project: { id: string } };
      server: { id: string };
    };
    appId = created.id;
    expect(created.status).toBe('RUNNING');
    expect(created.server.id).toBe(devServerId);
    expect(created.environment.id).toBe(devEnvId);
    expect(created.environment.project.id).toBe(projectId);

    await http()
      .post('/api/v1/applications')
      .set(auth(Role.DEVOPS))
      .send(body())
      .expect(409);
  });

  it('a VIEWER lists and filters applications', async () => {
    const res = await http()
      .get('/api/v1/applications')
      .query({ projectId, search: 'PAIE', status: 'RUNNING' })
      .set(auth(Role.VIEWER))
      .expect(200);
    const list = res.body as { data: { id: string }[]; meta: object };
    expect(list.data.map((a) => a.id)).toEqual([appId]);
    expect(list.meta).toMatchObject({ total: 1, page: 1 });

    await http()
      .get(`/api/v1/applications/${appId}`)
      .set(auth(Role.VIEWER))
      .expect(200);
  });

  it('moves the application to another server and its environment', async () => {
    const res = await http()
      .patch(`/api/v1/applications/${appId}`)
      .set(auth(Role.DEVOPS))
      .send({ serverId: prodServerId, version: '1.1.0', status: 'FAILED' })
      .expect(200);
    const updated = res.body as {
      version: string;
      status: string;
      environment: { id: string };
    };
    expect(updated.version).toBe('1.1.0');
    expect(updated.status).toBe('FAILED');
    expect(updated.environment.id).toBe(prodEnvId);
  });

  it('moving a server moves its applications', async () => {
    await http()
      .patch(`/api/v1/servers/${prodServerId}`)
      .set(auth(Role.DEVOPS))
      .send({ environmentId: devEnvId })
      .expect(200);

    const res = await http()
      .get(`/api/v1/applications/${appId}`)
      .set(auth(Role.VIEWER))
      .expect(200);
    expect((res.body as { environment: { id: string } }).environment.id).toBe(
      devEnvId,
    );
  });

  it('only an ADMIN can delete an application', async () => {
    await http()
      .delete(`/api/v1/applications/${appId}`)
      .set(auth(Role.DEVOPS))
      .expect(403);

    await http()
      .delete(`/api/v1/applications/${appId}`)
      .set(auth(Role.ADMIN))
      .expect(204);

    await http()
      .get(`/api/v1/applications/${appId}`)
      .set(auth(Role.ADMIN))
      .expect(404);
  });
});
