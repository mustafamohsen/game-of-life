import type { EngineKind, GameConfig } from './Config';
import type { LifeEngine } from '../engines/LifeEngine';

export type EngineFactory = (kind: EngineKind, config: GameConfig) => Promise<LifeEngine>;

type SessionSnapshot = {
  engine: EngineKind;
  generation: number;
  width: number;
  height: number;
  cells: Uint8Array;
};

export class PlaySession {
  private engine!: LifeEngine;
  private timer: number | undefined;
  private generation = 0;

  constructor(
    private readonly config: GameConfig,
    private readonly createEngine: EngineFactory,
    private readonly onSnapshot: (snapshot: SessionSnapshot) => void,
    private readonly setIntervalFn: typeof window.setInterval = window.setInterval.bind(window),
    private readonly clearIntervalFn: typeof window.clearInterval = window.clearInterval.bind(window),
  ) {}

  async start(kind: EngineKind = this.config.engine) {
    await this.switchEngine(kind);
    this.randomize();
  }

  async switchEngine(kind: EngineKind): Promise<EngineKind> {
    this.stop();
    this.engine = await this.createEngine(kind, this.config);
    this.config.engine = this.engine.kind;
    this.generation = 0;
    this.emit();
    return this.engine.kind;
  }

  async rebuild() {
    await this.switchEngine(this.config.engine);
  }

  play() {
    if (this.timer) return;
    this.timer = this.setIntervalFn(() => this.step(), this.config.tickRateMs);
  }

  stop() {
    if (this.timer) this.clearIntervalFn(this.timer);
    this.timer = undefined;
  }

  isPlaying() {
    return this.timer !== undefined;
  }

  restartTimer() {
    if (!this.isPlaying()) return;
    this.stop();
    this.play();
  }

  step() {
    this.engine.step();
    this.generation++;
    this.emit();
  }

  clear() {
    this.stop();
    this.engine.clear();
    this.generation = 0;
    this.emit();
  }

  randomize(density = this.config.randomDensity) {
    this.engine.randomize(density);
    this.generation = 0;
    this.emit();
  }

  setCell(x: number, y: number, alive: boolean) {
    this.engine.setCell(x, y, alive);
    this.emit();
  }

  toggleCell(x: number, y: number) {
    this.engine.toggleCell(x, y);
    this.emit();
  }

  redraw() {
    this.emit();
  }

  private emit() {
    this.onSnapshot({
      engine: this.config.engine,
      generation: this.generation,
      width: this.config.width,
      height: this.config.height,
      cells: this.engine.getCells(),
    });
  }
}
