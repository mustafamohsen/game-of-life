import type { LifeEngine } from "./LifeEngine";
import { ruleMask, type GameConfig } from "../app/Config";

export class JsLifeEngine implements LifeEngine {
  readonly kind = "js" as const;
  private cells: Uint8Array;
  private next: Uint8Array;
  private birthMask: number;
  private survivalMask: number;

  constructor(private config: GameConfig) {
    this.cells = new Uint8Array(config.width * config.height);
    this.next = new Uint8Array(config.width * config.height);
    this.birthMask = ruleMask(config.birthRules);
    this.survivalMask = ruleMask(config.survivalRules);
  }

  width() {
    return this.config.width;
  }
  height() {
    return this.config.height;
  }
  getCells() {
    return this.cells;
  }
  clear() {
    this.cells.fill(0);
  }

  randomize(density: number) {
    for (let i = 0; i < this.cells.length; i++) this.cells[i] = Math.random() < density ? 1 : 0;
  }

  setCell(x: number, y: number, alive: boolean) {
    if (x < 0 || y < 0 || x >= this.width() || y >= this.height()) return;
    this.cells[y * this.width() + x] = alive ? 1 : 0;
  }

  toggleCell(x: number, y: number) {
    if (x < 0 || y < 0 || x >= this.width() || y >= this.height()) return;
    const i = y * this.width() + x;
    this.cells[i] = this.cells[i] ? 0 : 1;
  }

  step() {
    const w = this.width();
    const h = this.height();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const alive = this.cells[y * w + x] === 1;
        const n = this.countNeighbors(x, y);
        const mask = alive ? this.survivalMask : this.birthMask;
        this.next[y * w + x] = (mask & (1 << n)) !== 0 ? 1 : 0;
      }
    }
    [this.cells, this.next] = [this.next, this.cells];
  }

  private countNeighbors(x: number, y: number): number {
    let count = 0;
    const w = this.width();
    const h = this.height();
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        let nx = x + dx,
          ny = y + dy;
        if (this.config.wrapEdges) {
          nx = (nx + w) % w;
          ny = (ny + h) % h;
        } else if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        count += this.cells[ny * w + nx];
      }
    return count;
  }
}
