import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MonitoringService } from './monitoring.service';

export const METRICS_INTERVAL_NAME = 'metrics-simulation';

/**
 * Writes simulated CPU/RAM measures every METRICS_INTERVAL_SECONDS (30 s by default).
 * METRICS_INTERVAL_SECONDS=0 turns the simulation off.
 * The interval is registered by hand (not with @Interval) because its length
 * comes from the environment.
 */
@Injectable()
export class MetricsScheduler implements OnModuleInit {
  private readonly logger = new Logger(MetricsScheduler.name);
  private running = false;

  constructor(
    private readonly monitoring: MonitoringService,
    private readonly config: ConfigService,
    private readonly registry: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    const seconds = Number(this.config.get('METRICS_INTERVAL_SECONDS') ?? 30);
    if (!Number.isFinite(seconds) || seconds <= 0) {
      this.logger.log('Simulation des mesures désactivée');
      return;
    }
    const interval = setInterval(() => void this.tick(), seconds * 1000);
    this.registry.addInterval(METRICS_INTERVAL_NAME, interval);
    this.logger.log(`Simulation des mesures toutes les ${seconds} s`);
  }

  /** Skips a tick if the previous one is still running. */
  async tick(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    try {
      const count = await this.monitoring.simulateAll();
      this.logger.debug(`${count} mesure(s) enregistrée(s)`);
    } catch (e) {
      this.logger.error(
        'Échec de la simulation',
        e instanceof Error ? e.stack : e,
      );
    } finally {
      this.running = false;
    }
  }
}
