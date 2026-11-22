import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ServerStatus } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMetricDto, MetricsQueryDto } from './dto/monitoring.dto';
import { nextUsage } from './metric-simulator';
import { MonitoringService } from './monitoring.service';

describe('nextUsage (simulation)', () => {
  it('starts in a normal range when there is no previous measure', () => {
    const u = nextUsage(null, () => 0.5);
    expect(u).toEqual({ cpuUsage: 35, ramUsage: 50 });
  });

  it('moves by at most 10 points without spike', () => {
    const u = nextUsage({ cpuUsage: 50, ramUsage: 50 }, () => 0.99);
    expect(u.cpuUsage).toBeCloseTo(59.8);
    expect(u.ramUsage).toBeCloseTo(59.8);
  });

  it('adds a CPU spike and stays between 1 and 99', () => {
    const values = [0.0, 0.5, 0.5]; // spike (0 < 3 %), CPU step 0, RAM step 0
    const u = nextUsage({ cpuUsage: 80, ramUsage: 0.5 }, () => values.shift()!);
    expect(u.cpuUsage).toBe(99);
    expect(u.ramUsage).toBe(1);
  });
});

describe('MonitoringService', () => {
  const prisma = {
    server: { findUnique: jest.fn(), findMany: jest.fn() },
    metric: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
    },
  };
  const service = new MonitoringService(prisma as unknown as PrismaService);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.server.findUnique.mockResolvedValue({ id: 's-1' });
  });

  it('returns 404 for an unknown server', async () => {
    prisma.server.findUnique.mockResolvedValue(null);

    await expect(
      service.record('x', { cpuUsage: 1, ramUsage: 1 }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.metric.create).not.toHaveBeenCalled();
  });

  it('returns the last hour by default, oldest point first', async () => {
    prisma.metric.findMany.mockResolvedValue([
      { cpuUsage: 2 },
      { cpuUsage: 1 },
    ]);

    const res = await service.getMetrics(
      's-1',
      plainToInstance(MetricsQueryDto, {}),
    );

    expect(res.to.getTime() - res.from.getTime()).toBe(60 * 60 * 1000);
    expect(res.data).toEqual([{ cpuUsage: 1 }, { cpuUsage: 2 }]);
    expect(prisma.metric.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { recordedAt: 'desc' },
        take: 500,
      }),
    );
  });

  it('refuses a period where from is after to', async () => {
    await expect(
      service.getMetrics('s-1', {
        from: new Date('2026-11-22T10:00:00Z'),
        to: new Date('2026-11-22T09:00:00Z'),
        limit: 10,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('gives a 404 when the server has no measure yet', async () => {
    prisma.metric.findFirst.mockResolvedValue(null);

    await expect(service.getLatest('s-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('computes the uptime percentage', async () => {
    prisma.metric.count.mockResolvedValueOnce(3).mockResolvedValueOnce(2);

    const res = await service.getUptime('s-1', {});

    expect(res).toMatchObject({
      totalMeasures: 3,
      upMeasures: 2,
      uptimePercent: 66.67,
    });
  });

  it('gives a null uptime when there is no measure', async () => {
    prisma.metric.count.mockResolvedValue(0);

    const res = await service.getUptime('s-1', {});

    expect(res.uptimePercent).toBeNull();
  });

  it('simulates ACTIVE servers and records OFFLINE ones as down', async () => {
    prisma.server.findMany.mockResolvedValue([
      {
        id: 'a',
        status: ServerStatus.ACTIVE,
        metrics: [{ cpuUsage: 50, ramUsage: 40 }],
      },
      { id: 'b', status: ServerStatus.OFFLINE, metrics: [] },
    ]);
    prisma.metric.createMany.mockResolvedValue({ count: 2 });

    const count = await service.simulateAll(() => 0.5);

    expect(count).toBe(2);
    expect(prisma.server.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: { in: [ServerStatus.ACTIVE, ServerStatus.OFFLINE] },
        },
      }),
    );
    expect(prisma.metric.createMany).toHaveBeenCalledWith({
      data: [
        { serverId: 'a', cpuUsage: 50, ramUsage: 40, isUp: true },
        { serverId: 'b', cpuUsage: 0, ramUsage: 0, isUp: false },
      ],
    });
  });

  it('writes nothing when no server is monitored', async () => {
    prisma.server.findMany.mockResolvedValue([]);

    await expect(service.simulateAll()).resolves.toBe(0);
    expect(prisma.metric.createMany).not.toHaveBeenCalled();
  });
});

describe('Monitoring DTOs', () => {
  it('rejects a CPU above 100 % and a negative RAM', async () => {
    const body = plainToInstance(CreateMetricDto, {
      cpuUsage: 120,
      ramUsage: -1,
    });

    const errors = await validate(body);
    expect(errors.map((e) => e.property).sort()).toEqual([
      'cpuUsage',
      'ramUsage',
    ]);
  });

  it('converts the period dates and rejects a bad one', async () => {
    const ok = plainToInstance(MetricsQueryDto, {
      from: '2026-11-22T08:00:00Z',
      limit: '50',
    });
    expect(await validate(ok)).toHaveLength(0);
    expect(ok.from).toBeInstanceOf(Date);
    expect(ok.limit).toBe(50);

    const bad = plainToInstance(MetricsQueryDto, { from: 'hier' });
    expect((await validate(bad)).map((e) => e.property)).toEqual(['from']);
  });
});
