export interface LifeEngine {
  readonly kind: "wasm" | "js";
  width(): number;
  height(): number;
  step(): void;
  clear(): void;
  randomize(density: number): void;
  setCell(x: number, y: number, alive: boolean): void;
  toggleCell(x: number, y: number): void;
  getCells(): Uint8Array;
}
