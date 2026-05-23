import init, { Universe } from '../../wasm-engine/pkg/wasm_engine.js';
import type { LifeEngine } from './LifeEngine';
import { ruleMask, type GameConfig } from '../app/Config';

let wasmMemory: WebAssembly.Memory | undefined;
let initPromise: Promise<void> | undefined;

export async function initWasm(): Promise<void> {
  initPromise ??= init().then((module) => { wasmMemory = module.memory; });
  return initPromise;
}

export class WasmLifeEngine implements LifeEngine {
  readonly kind = 'wasm' as const;
  private universe: Universe;

  constructor(config: GameConfig) {
    if (!wasmMemory) throw new Error('WASM not initialized');
    this.universe = new Universe(
      config.width,
      config.height,
      config.wrapEdges,
      ruleMask(config.birthRules),
      ruleMask(config.survivalRules),
    );
  }

  width() { return this.universe.width(); }
  height() { return this.universe.height(); }
  step() { this.universe.step(); }
  clear() { this.universe.clear(); }
  randomize(density: number) { this.universe.randomize(density); }
  setCell(x: number, y: number, alive: boolean) { this.universe.set_cell(x, y, alive); }
  toggleCell(x: number, y: number) { this.universe.toggle_cell(x, y); }

  getCells(): Uint8Array {
    if (!wasmMemory) throw new Error('WASM memory unavailable');
    return new Uint8Array(wasmMemory.buffer, this.universe.cells_ptr(), this.universe.len());
  }
}
