import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Metric, Prisma, ServerStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateMetricDto,
  MetricsQueryDto,
  PeriodQueryDto,
} from './dto/monitoring.dto';
import { nextUsage, Usage } from './metric-simulator';

const HOUR = 60 * 60 * 1000;

export type MetricPoint = Pick<
  Metric,
  'cpuUsage' | 'ramUsage' | 'isUp' | 'recordedAt'
>;

export interface MetricsHistory {
  serverId: string;
  from: Date;
  to: Date;
  data: MetricPoint[];
}

export interface Uptime {
  serverId: string;
  from: Date;
  to: Date;
  totalMeasures: number;
  upMeasures: number;
  /** null when there is no measure in the period. */
  uptimePercent: number | null;
}

const pointSelect = {
  cpuUsage: true,
  ramUsage: true,
  isUp: true,
  recordedAt: true,
} satisfies Prisma.MetricSelect;

@Injectable()
export class MonitoringService {
  constructor(private readonly prisma: PrismaService) {}

  /** Manual measure (Admin/DevOps). The scheduler uses simulateAll(). */
  async record(serverId: string, dto: CreateMetricDto): Promise<Metric> {
    await this.checkServer(serverId);
    return this.prisma.metric.create({ data: { ...dto, serverId } });
  }

  /** History for the charts, oldest first. Last hour by default. */
  async getMetrics(
    serverId: string,
    query: MetricsQueryDto,
  ): Promise<MetricsHistory> {
    await this.checkServer(serverId);
    const { from, to } = this.period(query, HOUR);

    // The most recent points of the period, then put back in time order.
    const rows = await this.prisma.metric.findMany({
      where: { serverId, recordedAt: { gte: from, lte: to } },
      select: pointSelect,
      orderBy: { recordedAt: 'desc' },
      take: query.limit,
    });
    return { serverId, from, to, data: rows.reverse() };
  }

  async getLatest(serverId: string): Promise<MetricPoint> {
    await this.checkServer(serverId);
    const metric = await this.prisma.metric.findFirst({
      where: { serverId },
      select: pointSelect,
      orderBy: { recordedAt: 'desc' },
    });
    if (!metric) {
      throw new NotFoundException('Aucune mesure pour ce serveur');
    }
    return metric;
  }

  /** Uptime % = measures where the server was up / all measures (RF-MON-4). Last 24 h by default. */
  async getUptime(serverId: string, query: PeriodQueryDto): Promise<Uptime> {
    await this.checkServer(serverId);
    const { from, to } = this.period(query, 24 * HOUR);
    const where = { serverId, recordedAt: { gte: from, lte: to } };

    const [totalMeasures, upMeasures] = await Promise.all([
      this.prisma.metric.count({ where }),
      this.prisma.metric.count({ where: { ...where, isUp: true } }),
    ]);
    const uptimePercent =
      totalMeasures === 0
        ? null
        : Math.round((upMeasures / totalMeasures) * 10000) / 100;
    return { serverId, from, to, totalMeasures, upMeasures, uptimePercent };
  }

  /**
   * One simulated measure per monitored server (called by the scheduler).
   * ACTIVE: CPU/RAM random walk, up. OFFLINE: down, 0 %.
   * STOPPED and MAINTENANCE are planned stops: no measure, so they do not
   * lower the uptime.
   * Returns the number of measures written.
   */
  async simulateAll(random: () => number = Math.random): Promise<number> {
    const servers = await this.prisma.server.findMany({
      where: { status: { in: [ServerStatus.ACTIVE, ServerStatus.OFFLINE] } },
      select: {
        id: true,
        status: true,
        metrics: {
          select: { cpuUsage: true, ramUsage: true },
          orderBy: { recordedAt: 'desc' },
          take: 1,
        },
      },
    });

    const data = servers.map((s) => {
      if (s.status === ServerStatus.OFFLINE) {
        return { serverId: s.id, cpuUsage: 0, ramUsage: 0, isUp: false };
      }
      const previous: Usage | null = s.metrics[0] ?? null;
      return { serverId: s.id, ...nextUsage(previous, random), isUp: true };
    });

    if (data.length === 0) {
      return 0;
    }
    const { count } = await this.prisma.metric.createMany({ data });
    return count;
  }

  private period(
    query: PeriodQueryDto,
    defaultLength: number,
  ): { from: Date; to: Date } {
    const to = query.to ?? new Date();
    const from = query.from ?? new Date(to.getTime() - defaultLength);
    if (from > to) {
      throw new BadRequestException('"from" doit être avant "to"');
    }
    return { from, to };
  }

  private async checkServer(serverId: string): Promise<void> {
    const server = await this.prisma.server.findUnique({
      where: { id: serverId },
      select: { id: true },
    });
    if (!server) {
      throw new NotFoundException('Serveur introuvable');
    }
  }
}
