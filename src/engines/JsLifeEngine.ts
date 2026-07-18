import type { LifeEngine } from "./LifeEngine";
import { ruleMask, type GameConfig } from "../app/Config";

export class JsLifeEngine implements LifeEngine {
  readonly kind = "js" as const;
  private cells: Uint8Array;
  private next: Uint8Array;
  private readonly birthMask: number;
  private readonly survivalMask: number;

  constructor(private readonly config: GameConfig) {
    this.cells = new Uint8Array(config.width * config.height);
    this.next = new Uint8Array(config.width * config.height);
    this.birthMask = ruleMask(config.birthRules);
    this.survivalMask = ruleMask(config.survivalRules);
  }

  width(): number {
    return this.config.width;
  }

  height(): number {
    return this.config.height;
  }

  getCells(): Uint8Array {
    return this.cells;
  }

  clear(): void {
    this.cells.fill(0);
  }

  randomize(density: number): void {
    for (let index = 0; index < this.cells.length; index++) {
      this.cells[index] = Math.random() < density ? 1 : 0;
    }
  }

  setCell(x: number, y: number, alive: boolean): void {
    if (this.isOutOfBounds(x, y)) return;
    this.cells[y * this.width() + x] = alive ? 1 : 0;
  }

  toggleCell(x: number, y: number): void {
    if (this.isOutOfBounds(x, y)) return;
    const index = y * this.width() + x;
    this.cells[index] = this.cells[index] ? 0 : 1;
  }

  step(): void {
    const width = this.width();
    const height = this.height();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        const alive = this.cells[index] === 1;
        const neighbors = this.countNeighbors(x, y);
        const ruleMask = alive ? this.survivalMask : this.birthMask;
        this.next[index] = (ruleMask & (1 << neighbors)) !== 0 ? 1 : 0;
      }
    }
    [this.cells, this.next] = [this.next, this.cells];
  }

  private isOutOfBounds(x: number, y: number): boolean {
    return x < 0 || y < 0 || x >= this.width() || y >= this.height();
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    const width = this.width();
    const height = this.height();

    for (let yOffset = -1; yOffset <= 1; yOffset++) {
      for (let xOffset = -1; xOffset <= 1; xOffset++) {
        if (xOffset === 0 && yOffset === 0) continue;

        let neighborX = x + xOffset;
        let neighborY = y + yOffset;
        if (this.config.wrapEdges) {
          neighborX = (neighborX + width) % width;
          neighborY = (neighborY + height) % height;
        } else if (
          neighborX < 0 ||
          neighborY < 0 ||
          neighborX >= width ||
          neighborY >= height
        ) {
          continue;
        }
        count += this.cells[neighborY * width + neighborX];
      }
    }

    return count;
  }
}
