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

process.env.METRICS_INTERVAL_SECONDS = '0';

/**
 * Needs the database running (docker compose up -d db) and migrated.
 * Creates its own users and projects, and deletes them at the end.
 */
describe('Projects and environments (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tag = randomUUID().slice(0, 8);
  const password = 'Password1!';
  const tokens: Partial<Record<Role, string>> = {};
  const ids: Partial<Record<Role, string>> = {};
  let projectId: string;
  let envId: string;

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
      const email = `e2e-prj-${role.toLowerCase()}-${tag}@test.local`;
      const user = await prisma.user.create({
        data: { email, passwordHash, firstName: 'E2E', lastName: role, role },
      });
      ids[role] = user.id;
      const res = await http()
        .post('/api/v1/auth/login')
        .send({ email, password })
        .expect(200);
      tokens[role] = (res.body as { accessToken: string }).accessToken;
    }
  });

  afterAll(async () => {
    await prisma.server.deleteMany({
      where: { environment: { project: { name: { endsWith: tag } } } },
    });
    await prisma.project.deleteMany({ where: { name: { endsWith: tag } } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag}@test.local` } },
    });
    await app.close();
  });

  it('rejects a request without token (401)', () => {
    return http().get('/api/v1/projects').expect(401);
  });

  it('a VIEWER cannot create a project (403)', () => {
    return http()
      .post('/api/v1/projects')
      .set(auth(Role.VIEWER))
      .send({ name: `Shop ${tag}` })
      .expect(403);
  });

  it('rejects an empty name (400)', () => {
    return http()
      .post('/api/v1/projects')
      .set(auth(Role.DEVOPS))
      .send({ name: '' })
      .expect(400);
  });

  it('a DEVOPS creates a project and becomes its owner', async () => {
    const res = await http()
      .post('/api/v1/projects')
      .set(auth(Role.DEVOPS))
      .send({ name: `Shop ${tag}`, description: 'E-commerce' })
      .expect(201);
    const project = res.body as {
      id: string;
      status: string;
      members: { projectRole: string; user: { id: string } }[];
    };
    projectId = project.id;
    expect(project.status).toBe('ACTIVE');
    expect(project.members).toEqual([
      expect.objectContaining({
        projectRole: 'OWNER',
        user: expect.objectContaining({ id: ids.DEVOPS }) as unknown,
      }),
    ]);
  });

  it('a VIEWER lists projects, filtered by member', async () => {
    const res = await http()
      .get('/api/v1/projects')
      .query({ memberId: ids.DEVOPS, search: tag })
      .set(auth(Role.VIEWER))
      .expect(200);
    const list = res.body as {
      data: { id: string; _count: { members: number } }[];
      meta: object;
    };
    expect(list.data.map((p) => p.id)).toEqual([projectId]);
    expect(list.data[0]._count.members).toBe(1);
    expect(list.meta).toMatchObject({ total: 1 });
  });

  it('a DEVOPS updates and archives the project', async () => {
    const res = await http()
      .patch(`/api/v1/projects/${projectId}`)
      .set(auth(Role.DEVOPS))
      .send({ status: 'ARCHIVED' })
      .expect(200);
    expect((res.body as { status: string }).status).toBe('ARCHIVED');
  });

  it('a DEVOPS finds users in the directory, a VIEWER cannot', async () => {
    const res = await http()
      .get('/api/v1/users/directory')
      .query({ search: `e2e-prj-viewer-${tag}` })
      .set(auth(Role.DEVOPS))
      .expect(200);
    expect(res.body).toEqual([
      {
        id: ids.VIEWER,
        email: `e2e-prj-viewer-${tag}@test.local`,
        firstName: 'E2E',
        lastName: 'VIEWER',
        role: 'VIEWER',
      },
    ]);

    await http()
      .get('/api/v1/users/directory')
      .set(auth(Role.VIEWER))
      .expect(403);
  });

  it('adds a member, a second time gives 409, an unknown user 404', async () => {
    await http()
      .post(`/api/v1/projects/${projectId}/members`)
      .set(auth(Role.DEVOPS))
      .send({ userId: ids.VIEWER })
      .expect(201);
    await http()
      .post(`/api/v1/projects/${projectId}/members`)
      .set(auth(Role.DEVOPS))
      .send({ userId: ids.VIEWER })
      .expect(409);
    await http()
      .post(`/api/v1/projects/${projectId}/members`)
      .set(auth(Role.DEVOPS))
      .send({ userId: randomUUID() })
      .expect(404);
  });

  it('removes a member but keeps the last owner', async () => {
    await http()
      .delete(`/api/v1/projects/${projectId}/members/${ids.VIEWER}`)
      .set(auth(Role.DEVOPS))
      .expect(204);
    await http()
      .delete(`/api/v1/projects/${projectId}/members/${ids.DEVOPS}`)
      .set(auth(Role.DEVOPS))
      .expect(400);
  });

  it('creates environments, a duplicate name gives 409', async () => {
    const res = await http()
      .post(`/api/v1/projects/${projectId}/environments`)
      .set(auth(Role.DEVOPS))
      .send({ type: 'PROD', name: 'prod' })
      .expect(201);
    envId = (res.body as { id: string }).id;

    await http()
      .post(`/api/v1/projects/${projectId}/environments`)
      .set(auth(Role.DEVOPS))
      .send({ type: 'DEV', name: 'prod' })
      .expect(409);

    await http()
      .post(`/api/v1/projects/${randomUUID()}/environments`)
      .set(auth(Role.DEVOPS))
      .send({ type: 'DEV', name: 'dev' })
      .expect(404);
  });

  it('lists and renames an environment', async () => {
    await http()
      .patch(`/api/v1/environments/${envId}`)
      .set(auth(Role.DEVOPS))
      .send({ name: 'production' })
      .expect(200);

    const res = await http()
      .get(`/api/v1/projects/${projectId}/environments`)
      .set(auth(Role.VIEWER))
      .expect(200);
    expect(res.body).toEqual([
      expect.objectContaining({
        id: envId,
        name: 'production',
        _count: { servers: 0, applications: 0 },
      }),
    ]);
  });

  it('a server blocks the deletion of its environment and project (409)', async () => {
    const server = await prisma.server.create({
      data: {
        environmentId: envId,
        name: 'web-01',
        provider: 'AWS',
        region: 'eu-west-3',
        cpuCores: 1,
        ramGb: 1,
        storageGb: 10,
      },
    });

    await http()
      .delete(`/api/v1/environments/${envId}`)
      .set(auth(Role.ADMIN))
      .expect(409);
    await http()
      .delete(`/api/v1/projects/${projectId}`)
      .set(auth(Role.ADMIN))
      .expect(409);

    await prisma.server.delete({ where: { id: server.id } });
  });

  it('only an ADMIN deletes environments and projects', async () => {
    await http()
      .delete(`/api/v1/environments/${envId}`)
      .set(auth(Role.DEVOPS))
      .expect(403);
    await http()
      .delete(`/api/v1/environments/${envId}`)
      .set(auth(Role.ADMIN))
      .expect(204);

    await http()
      .delete(`/api/v1/projects/${projectId}`)
      .set(auth(Role.DEVOPS))
      .expect(403);
    await http()
      .delete(`/api/v1/projects/${projectId}`)
      .set(auth(Role.ADMIN))
      .expect(204);
    await http()
      .get(`/api/v1/projects/${projectId}`)
      .set(auth(Role.ADMIN))
      .expect(404);
  });
});
