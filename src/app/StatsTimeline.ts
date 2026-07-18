export type StatsEvent = "step" | "rewind" | "seed" | "wipe" | "edit" | "pattern" | "rebuild";

export type StatsSample = {
  generation: number;
  population: number;
  births: number;
  deaths: number;
  delta: number;
  density: number;
  period: number | undefined;
  event: StatsEvent | undefined;
};

export class StatsTimeline {
  private samples: StatsSample[] = [];

  constructor(private readonly maxSamples = 2_000) {}

  reset(initial?: StatsSample): void {
    this.samples = initial ? [initial] : [];
  }

  append(sample: StatsSample): void {
    this.samples.push(sample);
    const overflow = this.samples.length - this.maxSamples;
    if (overflow > 0) this.samples.splice(0, overflow);
  }

  snapshot(): readonly StatsSample[] {
    return this.samples;
  }
}
