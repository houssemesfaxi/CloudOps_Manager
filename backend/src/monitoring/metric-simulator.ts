export interface Usage {
  cpuUsage: number;
  ramUsage: number;
}

const MAX_STEP = 10; // a value moves by at most 10 points between two measures
const SPIKE_CHANCE = 0.03; // 3 % of the measures are a CPU spike
const SPIKE_SIZE = 35;

const clamp = (v: number) => Math.min(99, Math.max(1, v));
const round = (v: number) => Math.round(v * 10) / 10;

/**
 * Next simulated CPU/RAM measure of a running server (docs/01, RF-MON-2).
 * A random walk from the previous measure, so the charts look realistic,
 * with rare CPU spikes so that the alert rules (step 16) can trigger.
 * `random` is injectable to make the tests predictable.
 */
export function nextUsage(
  previous: Usage | null,
  random: () => number = Math.random,
): Usage {
  if (!previous) {
    return {
      cpuUsage: round(15 + random() * 40),
      ramUsage: round(30 + random() * 40),
    };
  }
  const step = () => (random() * 2 - 1) * MAX_STEP;
  const spike = random() < SPIKE_CHANCE ? SPIKE_SIZE : 0;
  return {
    cpuUsage: round(clamp(previous.cpuUsage + step() + spike)),
    ramUsage: round(clamp(previous.ramUsage + step())),
  };
}
