import { describe, expect, it } from "vitest";
import { centerPatternCells, patternBounds } from "./PatternGeometry";

describe("pattern geometry", () => {
  const cells = [
    [1, 0],
    [2, 1],
    [0, 2],
    [1, 2],
    [2, 2],
  ] as const;

  it("calculates the same extent used by previews", () => {
    expect(patternBounds(cells)).toEqual({ maxX: 2, maxY: 2 });
  });

  it("centers cells without changing their placement order", () => {
    expect(centerPatternCells(cells, 10, 20)).toEqual([
      [10, 19],
      [11, 20],
      [9, 21],
      [10, 21],
      [11, 21],
    ]);
  });
});
