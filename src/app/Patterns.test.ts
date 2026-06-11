import { describe, expect, it } from "vitest";
import { LIFE_PATTERNS, type PatternCategory } from "./Patterns";

const CATEGORIES: PatternCategory[] = [
  "spaceships",
  "oscillators",
  "still-lifes",
  "seeds",
  "guns",
  "mega",
];

describe("LIFE_PATTERNS", () => {
  it("keeps the expanded pattern catalog categorized and placeable", () => {
    expect(LIFE_PATTERNS).toHaveLength(116);

    const ids = new Set<string>();
    for (const pattern of LIFE_PATTERNS) {
      expect(ids.has(pattern.id)).toBe(false);
      ids.add(pattern.id);
      expect(CATEGORIES).toContain(pattern.category);
      expect(pattern.cells.length).toBeGreaterThan(0);
    }
  });
});
