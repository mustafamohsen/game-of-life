import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../app/Config";
import { JsLifeEngine } from "./JsLifeEngine";

const config = { ...DEFAULT_CONFIG, width: 5, height: 5, wrapEdges: false };

describe("JsLifeEngine", () => {
  it("keeps a block still life stable", () => {
    const engine = new JsLifeEngine(config);
    engine.setCell(1, 1, true);
    engine.setCell(2, 1, true);
    engine.setCell(1, 2, true);
    engine.setCell(2, 2, true);
    const before = [...engine.getCells()];
    engine.step();
    expect([...engine.getCells()]).toEqual(before);
  });

  it("oscillates a blinker", () => {
    const engine = new JsLifeEngine(config);
    engine.setCell(2, 1, true);
    engine.setCell(2, 2, true);
    engine.setCell(2, 3, true);
    engine.step();
    expect(engine.getCells()[2 * 5 + 1]).toBe(1);
    expect(engine.getCells()[2 * 5 + 2]).toBe(1);
    expect(engine.getCells()[2 * 5 + 3]).toBe(1);
  });
});
