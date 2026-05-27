import type { GameConfig } from "../app/Config";

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private previousCells: Uint8Array | undefined;
  private lastCells: Uint8Array | undefined;

  constructor(
    public readonly canvas: HTMLCanvasElement,
    private config: GameConfig,
  ) {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    this.ctx = ctx;
    this.resize(config);
  }

  resize(config: GameConfig) {
    this.config = config;
    this.canvas.width = config.width * config.cellSize;
    this.canvas.height = config.height * config.cellSize;
    this.canvas.style.setProperty("--canvas-aspect", String(config.width / config.height));
    this.previousCells = undefined;
    this.lastCells = undefined;
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

  resetState(cells: Uint8Array | undefined) {
    this.previousCells = undefined;
    this.lastCells = cells ? new Uint8Array(cells) : undefined;
  }

  drawPatternPreview(cells: readonly [number, number][], centerX: number, centerY: number) {
    const { width, height, cellSize } = this.config;
    const maxX = Math.max(...cells.map(([x]) => x));
    const maxY = Math.max(...cells.map(([, y]) => y));
    const originX = centerX - Math.floor((maxX + 1) / 2);
    const originY = centerY - Math.floor((maxY + 1) / 2);
    const inset = cellSize >= 8 ? 1 : 0;
    this.ctx.save();
    this.ctx.globalAlpha = 0.58;
    this.ctx.fillStyle = "#4d9dff";
    this.ctx.strokeStyle = "rgba(215, 221, 229, 0.72)";
    this.ctx.lineWidth = 1;
    for (const [x, y] of cells) {
      const targetX = originX + x;
      const targetY = originY + y;
      if (targetX < 0 || targetY < 0 || targetX >= width || targetY >= height) continue;
      const px = targetX * cellSize + inset;
      const py = targetY * cellSize + inset;
      const size = cellSize - inset * 2;
      this.ctx.fillRect(px, py, size, size);
      if (cellSize >= 7) this.ctx.strokeRect(px + 0.5, py + 0.5, size - 1, size - 1);
    }
    this.ctx.restore();
  }

  draw(cells: Uint8Array, rememberState = true) {
    const { width, height, cellSize, colors, showGrid } = this.config;
    this.drawFieldBackground(colors.background);

    if (this.config.colorizeStates)
      this.drawStateCells(cells, width, height, cellSize, colors.alive);
    else this.drawMonoCells(cells, width, height, cellSize, colors.alive);

    if (showGrid && cellSize >= 5) this.drawGrid(width, height, cellSize, colors.grid);
    this.drawFrameShadow();
    if (rememberState) {
      this.previousCells = this.lastCells;
      this.lastCells = new Uint8Array(cells);
    }
  }

  private drawMonoCells(
    cells: Uint8Array,
    width: number,
    height: number,
    cellSize: number,
    aliveColor: string,
  ) {
    const cellPath = this.cellsPath(cells, width, height, cellSize, (alive) => alive);
    this.drawGlow(cellPath, "rgba(77, 157, 255, 0.26)", "rgba(77, 157, 255, 0.34)", cellSize);
    this.ctx.fillStyle = aliveColor;
    this.ctx.fill(cellPath);
  }

  private drawStateCells(
    cells: Uint8Array,
    width: number,
    height: number,
    cellSize: number,
    aliveColor: string,
  ) {
    const previous = this.previousCells;
    const born = previous
      ? this.cellsPath(cells, width, height, cellSize, (alive, wasAlive) => alive && !wasAlive)
      : new Path2D();
    const surviving = this.cellsPath(
      cells,
      width,
      height,
      cellSize,
      (alive, wasAlive) => alive && (!previous || wasAlive),
    );
    const dying = previous
      ? this.cellsPath(cells, width, height, cellSize, (alive, wasAlive) => !alive && wasAlive)
      : new Path2D();

    this.drawGlow(born, "rgba(77, 157, 255, 0.34)", "rgba(77, 157, 255, 0.38)", cellSize);
    this.ctx.fillStyle = "#4d9dff";
    this.ctx.fill(born);
    this.ctx.fillStyle = aliveColor;
    this.ctx.fill(surviving);
    this.ctx.fillStyle = "rgba(150, 170, 195, 0.18)";
    this.ctx.fill(dying);
  }

  private cellsPath(
    cells: Uint8Array,
    width: number,
    height: number,
    cellSize: number,
    include: (alive: boolean, wasAlive: boolean) => boolean,
  ) {
    const inset = cellSize >= 8 ? 1 : 0;
    const path = new Path2D();
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = y * width + x;
        if (!include(cells[index] === 1, this.previousCells?.[index] === 1)) continue;
        path.rect(
          x * cellSize + inset,
          y * cellSize + inset,
          cellSize - inset * 2,
          cellSize - inset * 2,
        );
      }
    }
    return path;
  }

  private drawGlow(path: Path2D, shadowColor: string, fillColor: string, cellSize: number) {
    this.ctx.save();
    this.ctx.shadowColor = shadowColor;
    this.ctx.shadowBlur = Math.max(4, cellSize * 0.9);
    this.ctx.fillStyle = fillColor;
    this.ctx.fill(path);
    this.ctx.restore();
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

    this.ctx.strokeStyle = "rgba(150, 170, 195, 0.11)";
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
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
    this.ctx.fillRect(0, 0, this.canvas.width, edge);
    this.ctx.fillRect(0, this.canvas.height - edge, this.canvas.width, edge);
    this.ctx.fillRect(0, 0, edge, this.canvas.height);
    this.ctx.fillRect(this.canvas.width - edge, 0, edge, this.canvas.height);
  }
}
