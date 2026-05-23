import type { GameConfig } from '../app/Config';

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;

  constructor(public readonly canvas: HTMLCanvasElement, private config: GameConfig) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.resize(config);
  }

  resize(config: GameConfig) {
    this.config = config;
    this.canvas.width = config.width * config.cellSize;
    this.canvas.height = config.height * config.cellSize;
  }

  cellFromEvent(event: MouseEvent): [number, number] {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return [
      Math.floor(((event.clientX - rect.left) * scaleX) / this.config.cellSize),
      Math.floor(((event.clientY - rect.top) * scaleY) / this.config.cellSize),
    ];
  }

  draw(cells: Uint8Array) {
    const { width, height, cellSize, colors, showGrid } = this.config;
    this.ctx.fillStyle = colors.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = colors.alive;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (cells[y * width + x]) this.ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
    if (!showGrid || cellSize < 5) return;
    this.ctx.strokeStyle = colors.grid;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    for (let x = 0; x <= width; x++) {
      this.ctx.moveTo(x * cellSize + 0.5, 0);
      this.ctx.lineTo(x * cellSize + 0.5, height * cellSize);
    }
    for (let y = 0; y <= height; y++) {
      this.ctx.moveTo(0, y * cellSize + 0.5);
      this.ctx.lineTo(width * cellSize, y * cellSize + 0.5);
    }
    this.ctx.stroke();
  }
}
