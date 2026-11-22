import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { METRICS_INTERVAL_NAME, MetricsScheduler } from './metrics.scheduler';
import { MonitoringService } from './monitoring.service';

describe('MetricsScheduler', () => {
  const monitoring = { simulateAll: jest.fn() };
  const registry = new SchedulerRegistry();

  const build = (seconds: string | undefined) =>
    new MetricsScheduler(
      monitoring as unknown as MonitoringService,
      { get: () => seconds } as unknown as ConfigService,
      registry,
    );

  afterEach(() => {
    if (registry.doesExist('interval', METRICS_INTERVAL_NAME)) {
      registry.deleteInterval(METRICS_INTERVAL_NAME);
    }
    jest.clearAllMocks();
  });

  it('registers an interval from METRICS_INTERVAL_SECONDS', () => {
    build('30').onModuleInit();
    expect(registry.doesExist('interval', METRICS_INTERVAL_NAME)).toBe(true);
  });

  it('is turned off with 0', () => {
    build('0').onModuleInit();
    expect(registry.doesExist('interval', METRICS_INTERVAL_NAME)).toBe(false);
  });

  it('does not start a tick while the previous one is running', async () => {
    let finish: (n: number) => void = () => undefined;
    monitoring.simulateAll.mockReturnValue(
      new Promise<number>((resolve) => (finish = resolve)),
    );
    const scheduler = build('30');

    const first = scheduler.tick();
    await scheduler.tick(); // skipped
    finish(1);
    await first;

    expect(monitoring.simulateAll).toHaveBeenCalledTimes(1);
  });

  it('survives a database error', async () => {
    monitoring.simulateAll.mockRejectedValue(new Error('db down'));
    const scheduler = build('30');
    jest
      .spyOn(scheduler['logger'], 'error')
      .mockImplementation(() => undefined);

    await expect(scheduler.tick()).resolves.toBeUndefined();
  });
});
