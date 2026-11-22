import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { MonitoringService } from './../src/monitoring/monitoring.service';
import { PrismaService } from './../src/prisma/prisma.service';
import { setupApp } from './../src/setup-app';

// No background simulation during the test: measures are written by the test itself.
process.env.METRICS_INTERVAL_SECONDS = '0';

/**
 * Needs the database running (docker compose up -d db) and migrated.
 * Creates its own users, project, environment and server, and deletes them at the end.
 */
describe('Monitoring (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const tag = randomUUID().slice(0, 8);
  const password = 'Password1!';
  const tokens: Partial<Record<Role, string>> = {};
  let projectId: string;
  let serverId: string;

  const http = () => request(app.getHttpServer());
  const auth = (role: Role) => ({ Authorization: `Bearer ${tokens[role]}` });
  const url = (path: string) => `/api/v1/monitoring/servers/${serverId}${path}`;

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
      const email = `e2e-mon-${role.toLowerCase()}-${tag}@test.local`;
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
      where: { email: `e2e-mon-admin-${tag}@test.local` },
    });
    const project = await prisma.project.create({
      data: { name: `e2e-${tag}`, createdById: admin.id },
    });
    projectId = project.id;
    const env = await prisma.environment.create({
      data: { projectId, type: 'DEV', name: 'dev' },
    });
    const server = await prisma.server.create({
      data: {
        environmentId: env.id,
        name: 'web-01',
        provider: 'AWS',
        region: 'eu-west-3',
        cpuCores: 2,
        ramGb: 4,
        storageGb: 80,
      },
    });
    serverId = server.id;
  });

  afterAll(async () => {
    // Deleting the server deletes its metrics (cascade).
    await prisma.server.deleteMany({ where: { id: serverId } });
    await prisma.project.deleteMany({ where: { id: projectId } });
    await prisma.user.deleteMany({
      where: { email: { endsWith: `-${tag}@test.local` } },
    });
    await app.close();
  });

  it('rejects a request without token (401)', () => {
    return http().get(url('/metrics')).expect(401);
  });

  it('returns 404 when there is no measure yet', () => {
    return http().get(url('/latest')).set(auth(Role.VIEWER)).expect(404);
  });

  it('gives a null uptime without measures', async () => {
    const res = await http()
      .get(url('/uptime'))
      .set(auth(Role.VIEWER))
      .expect(200);
    expect(res.body).toMatchObject({ totalMeasures: 0, uptimePercent: null });
  });

  it('a VIEWER cannot add a measure (403)', () => {
    return http()
      .post(url('/metrics'))
      .set(auth(Role.VIEWER))
      .send({ cpuUsage: 10, ramUsage: 20 })
      .expect(403);
  });

  it('rejects a CPU above 100 % (400)', () => {
    return http()
      .post(url('/metrics'))
      .set(auth(Role.DEVOPS))
      .send({ cpuUsage: 150, ramUsage: 20 })
      .expect(400);
  });

  it('returns 404 for an unknown server', () => {
    return http()
      .post(`/api/v1/monitoring/servers/${randomUUID()}/metrics`)
      .set(auth(Role.DEVOPS))
      .send({ cpuUsage: 10, ramUsage: 20 })
      .expect(404);
  });

  it('a DEVOPS adds measures, the latest one is returned', async () => {
    await http()
      .post(url('/metrics'))
      .set(auth(Role.DEVOPS))
      .send({ cpuUsage: 10, ramUsage: 20 })
      .expect(201);
    await http()
      .post(url('/metrics'))
      .set(auth(Role.ADMIN))
      .send({ cpuUsage: 0, ramUsage: 0, isUp: false })
      .expect(201);

    const res = await http()
      .get(url('/latest'))
      .set(auth(Role.VIEWER))
      .expect(200);
    expect(res.body).toMatchObject({ cpuUsage: 0, isUp: false });
  });

  it('the scheduler job adds a simulated measure', async () => {
    await app.get(MonitoringService).simulateAll();

    const res = await http()
      .get(url('/metrics'))
      .set(auth(Role.VIEWER))
      .expect(200);
    const history = res.body as {
      data: { cpuUsage: number; isUp: boolean; recordedAt: string }[];
    };
    expect(history.data).toHaveLength(3);
    // Oldest first, for the charts.
    const times = history.data.map((m) => Date.parse(m.recordedAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(history.data[2].isUp).toBe(true);
  });

  it('computes the uptime: 2 up out of 3', async () => {
    const res = await http()
      .get(url('/uptime'))
      .set(auth(Role.VIEWER))
      .expect(200);
    expect(res.body).toMatchObject({
      totalMeasures: 3,
      upMeasures: 2,
      uptimePercent: 66.67,
    });
  });

  it('filters the history by period', async () => {
    const res = await http()
      .get(url('/metrics'))
      .query({ from: '2020-01-01T00:00:00Z', to: '2020-01-02T00:00:00Z' })
      .set(auth(Role.VIEWER))
      .expect(200);
    expect((res.body as { data: unknown[] }).data).toHaveLength(0);

    await http()
      .get(url('/metrics'))
      .query({ from: '2020-01-02T00:00:00Z', to: '2020-01-01T00:00:00Z' })
      .set(auth(Role.VIEWER))
      .expect(400);
  });
});
