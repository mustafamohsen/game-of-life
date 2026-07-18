import { describe, expect, it } from "vitest";
import { ruleMask } from "./Config";

describe("ruleMask", () => {
  it("sets bits for valid neighbor counts and ignores out-of-range values", () => {
    expect(ruleMask([0, 3, 8, -1, 9, Number.NaN, Number.POSITIVE_INFINITY])).toBe(
      (1 << 0) | (1 << 3) | (1 << 8),
    );
  });

  it("preserves JavaScript bit-shift coercion for in-range fractional entries", () => {
    expect(ruleMask([1.9, 3.1])).toBe((1 << 1) | (1 << 3));
  });
});
