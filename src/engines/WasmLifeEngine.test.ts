import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CONFIG } from "../app/Config";

const memory = new WebAssembly.Memory({ initial: 1 });
const calls: string[] = [];

vi.mock("../../wasm-engine/pkg/wasm_engine.js", () => ({
  default: vi.fn(async () => ({ memory })),
  Universe: class MockUniverse {
    width() {
      return 3;
    }
    height() {
      return 2;
    }
    step() {
      calls.push("step");
    }
    clear() {
      calls.push("clear");
    }
    randomize(density: number) {
      calls.push(`randomize:${density}`);
    }
    set_cell(x: number, y: number, alive: boolean) {
      calls.push(`set:${x},${y},${alive}`);
    }
    toggle_cell(x: number, y: number) {
      calls.push(`toggle:${x},${y}`);
    }
    cells_ptr() {
      return 8;
    }
    len() {
      return 6;
    }
  },
}));

import init from "../../wasm-engine/pkg/wasm_engine.js";
import { initWasm, WasmLifeEngine } from "./WasmLifeEngine";

describe("WasmLifeEngine", () => {
  it("requires initialization before construction", () => {
    expect(() => new WasmLifeEngine({ ...DEFAULT_CONFIG, width: 3, height: 2 })).toThrow(
      "WASM not initialized",
    );
  });

  it("initializes once, returns live memory views, and forwards operations", async () => {
    await Promise.all([initWasm(), initWasm()]);
    expect(init).toHaveBeenCalledTimes(1);

    const engine = new WasmLifeEngine({ ...DEFAULT_CONFIG, width: 3, height: 2 });
    const firstView = engine.getCells();
    firstView[0] = 1;

    expect(engine.width()).toBe(3);
    expect(engine.height()).toBe(2);
    expect(engine.getCells()).not.toBe(firstView);
    expect(engine.getCells().buffer).toBe(firstView.buffer);
    expect(engine.getCells()[0]).toBe(1);

    engine.step();
    engine.clear();
    engine.randomize(0.25);
    engine.setCell(-1, 9, true);
    engine.toggleCell(4, 5);
    expect(calls).toEqual([
      "step",
      "clear",
      "randomize:0.25",
      "set:-1,9,true",
      "toggle:4,5",
    ]);
  });
});
