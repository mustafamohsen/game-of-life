import { describe, expect, it } from "vitest";
import { StatsTimeline, type StatsEvent, type StatsSample } from "./StatsTimeline";

function sample(generation: number, event: StatsEvent = "step"): StatsSample {
  return {
    generation,
    population: generation,
    births: 0,
    deaths: 0,
    delta: 0,
    density: 0,
    period: undefined,
    event,
  };
}

describe("StatsTimeline", () => {
  it("retains only the newest samples in timeline order", () => {
    const timeline = new StatsTimeline(2);

    timeline.append(sample(1));
    timeline.append(sample(2));
    timeline.append(sample(3));

    expect(timeline.snapshot().map(({ generation }) => generation)).toEqual([2, 3]);
  });

  it("returns its live backing array until reset replaces it", () => {
    const timeline = new StatsTimeline();
    const first = sample(1);
    timeline.append(first);
    const beforeReset = timeline.snapshot();

    timeline.append(sample(2));
    expect(timeline.snapshot()).toBe(beforeReset);
    expect(beforeReset).toHaveLength(2);

    const initial = sample(0, "seed");
    timeline.reset(initial);
    expect(timeline.snapshot()).not.toBe(beforeReset);
    expect(timeline.snapshot()).toEqual([initial]);
  });
});
