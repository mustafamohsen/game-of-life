import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../app/Config";
import { JsLifeEngine } from "./JsLifeEngine";

const config = { ...DEFAULT_CONFIG, width: 5, height: 5, wrapEdges: false };

describe("JsLifeEngine", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

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

  it("uses row-major indexing and ignores out-of-bounds edits", () => {
    const engine = new JsLifeEngine(config);

    engine.setCell(4, 3, true);
    engine.setCell(-1, 0, true);
    engine.setCell(5, 0, true);
    engine.toggleCell(0, -1);
    engine.toggleCell(0, 5);

    expect([...engine.getCells()].flatMap((cell, index) => (cell ? [index] : []))).toEqual([19]);
  });

  it("retains the current array for edits and swaps array identity after each step", () => {
    const engine = new JsLifeEngine(config);
    const initialCells = engine.getCells();

    engine.setCell(1, 1, true);
    engine.clear();
    expect(engine.getCells()).toBe(initialCells);

    engine.step();
    const nextCells = engine.getCells();
    expect(nextCells).not.toBe(initialCells);

    engine.step();
    expect(engine.getCells()).toBe(initialCells);
  });

  it("draws one random value per cell in row-major order", () => {
    const values = Array.from({ length: 25 }, (_, index) => index / 25);
    const random = vi.spyOn(Math, "random");
    for (const value of values) random.mockReturnValueOnce(value);
    const engine = new JsLifeEngine(config);

    engine.randomize(0.2);

    expect(random).toHaveBeenCalledTimes(25);
    expect([...engine.getCells()]).toEqual(values.map((value) => (value < 0.2 ? 1 : 0)));
  });

  it("reads edge-wrapping configuration at step time", () => {
    const mutableConfig = { ...config, wrapEdges: false };
    const engine = new JsLifeEngine(mutableConfig);
    engine.setCell(0, 0, true);
    engine.setCell(4, 0, true);
    engine.setCell(0, 4, true);

    engine.step();
    expect(engine.getCells()[4 * 5 + 4]).toBe(0);

    engine.clear();
    engine.setCell(0, 0, true);
    engine.setCell(4, 0, true);
    engine.setCell(0, 4, true);
    mutableConfig.wrapEdges = true;
    engine.step();

    expect(engine.getCells()[4 * 5 + 4]).toBe(1);
  });
});
