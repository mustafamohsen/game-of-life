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
    this.canvas.style.setProperty('--canvas-aspect', String(config.width / config.height));
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
    this.drawFieldBackground(colors.background);

    const inset = cellSize >= 8 ? 1 : 0;
    const cellPath = new Path2D();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (!cells[y * width + x]) continue;
        cellPath.rect(x * cellSize + inset, y * cellSize + inset, cellSize - inset * 2, cellSize - inset * 2);
      }
    }

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(77, 157, 255, 0.26)';
    this.ctx.shadowBlur = Math.max(4, cellSize * 0.9);
    this.ctx.fillStyle = 'rgba(77, 157, 255, 0.34)';
    this.ctx.fill(cellPath);
    this.ctx.restore();

    this.ctx.fillStyle = colors.alive;
    this.ctx.fill(cellPath);

    if (showGrid && cellSize >= 5) this.drawGrid(width, height, cellSize, colors.grid);
    this.drawFrameShadow();
  }

  private drawFieldBackground(background: string) {
    this.ctx.fillStyle = background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawGrid(width: number, height: number, cellSize: number, grid: string) {
    this.ctx.save();
    this.ctx.strokeStyle = grid;
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

    this.ctx.strokeStyle = 'rgba(150, 170, 195, 0.11)';
    this.ctx.beginPath();
    for (let x = 0; x <= width; x += 10) {
      this.ctx.moveTo(x * cellSize + 0.5, 0);
      this.ctx.lineTo(x * cellSize + 0.5, height * cellSize);
    }
    for (let y = 0; y <= height; y += 10) {
      this.ctx.moveTo(0, y * cellSize + 0.5);
      this.ctx.lineTo(width * cellSize, y * cellSize + 0.5);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawFrameShadow() {
    const edge = Math.max(12, Math.min(this.canvas.width, this.canvas.height) * 0.035);
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    this.ctx.fillRect(0, 0, this.canvas.width, edge);
    this.ctx.fillRect(0, this.canvas.height - edge, this.canvas.width, edge);
    this.ctx.fillRect(0, 0, edge, this.canvas.height);
    this.ctx.fillRect(this.canvas.width - edge, 0, edge, this.canvas.height);
  }
}
