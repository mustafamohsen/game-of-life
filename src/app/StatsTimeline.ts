export type StatsEvent = 'step' | 'seed' | 'wipe' | 'edit' | 'pattern' | 'rebuild';

export type StatsSample = {
  generation: number;
  population: number;
  births: number;
  deaths: number;
  delta: number;
  density: number;
  churn: number;
  period: number | undefined;
  event: StatsEvent | undefined;
};

export class StatsTimeline {
  private samples: StatsSample[] = [];

  constructor(private readonly maxSamples = 2_000) {}

  reset(initial?: StatsSample) {
    this.samples = initial ? [initial] : [];
  }

  append(sample: StatsSample) {
    this.samples.push(sample);
    if (this.samples.length > this.maxSamples) {
      this.samples.splice(0, this.samples.length - this.maxSamples);
    }
  }

  snapshot(): readonly StatsSample[] {
    return this.samples;
  }
}
