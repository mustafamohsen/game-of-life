import { describe, expect, it } from "vitest";
import { buildEventMarkers, buildLinePath } from "./StatsChart";
import type { StatsSample } from "./StatsTimeline";

const sample = (event: StatsSample["event"]): StatsSample => ({
  generation: 0,
  population: 0,
  births: 0,
  deaths: 0,
  delta: 0,
  density: 0,
  period: undefined,
  event,
});

describe("buildLinePath", () => {
  it("preserves empty and single-sample chart output", () => {
    expect(buildLinePath([], 320, 96)).toBe("");
    expect(buildLinePath([12], 320, 96)).toBe("M 0 96 L 320 96");
  });

  it("scales values and honors a shared forced maximum", () => {
    expect(buildLinePath([0, 2, 1], 320, 96)).toBe(
      "M 0.00 96.00 L 160.00 0.00 L 320.00 48.00",
    );
    expect(buildLinePath([0, 2], 320, 72, 4)).toBe("M 0.00 72.00 L 320.00 36.00");
  });
});

describe("buildEventMarkers", () => {
  it("marks non-step events at their timeline positions", () => {
    const history = [sample("seed"), sample("step"), sample(undefined), sample("wipe")];

    expect(buildEventMarkers(history, 320, 96)).toBe(
      '<line x1="0.00" x2="0.00" y1="0" y2="96" />' +
        '<line x1="320.00" x2="320.00" y1="0" y2="96" />',
    );
  });
});
