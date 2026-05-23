import type { EngineKind, GameConfig } from './Config';
import type { LifeEngine } from '../engines/LifeEngine';
import { StatsTimeline, type StatsSample } from './StatsTimeline';

export type EngineFactory = (kind: EngineKind, config: GameConfig) => Promise<LifeEngine>;

type SessionSnapshot = {
  engine: EngineKind;
  generation: number;
  width: number;
  height: number;
  cells: Uint8Array;
  population: number;
  births: number;
  deaths: number;
  delta: number;
  statsHistory: readonly StatsSample[];
};

export class PlaySession {
  private engine!: LifeEngine;
  private timer: number | undefined;
  private generation = 0;
  private previousCells: Uint8Array | undefined;
  private lastStats = { population: 0, births: 0, deaths: 0, delta: 0 };
  private readonly statsTimeline = new StatsTimeline();

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
    this.previousCells = undefined;
    this.emit(true, 'reset');
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
    this.emit(true, 'append');
  }

  clear() {
    this.stop();
    this.engine.clear();
    this.generation = 0;
    this.previousCells = undefined;
    this.emit(true, 'reset');
  }

  randomize(density = this.config.randomDensity) {
    this.engine.randomize(density);
    this.generation = 0;
    this.previousCells = undefined;
    this.emit(true, 'reset');
  }

  setCell(x: number, y: number, alive: boolean) {
    this.engine.setCell(x, y, alive);
    this.emit(true, 'append');
  }

  toggleCell(x: number, y: number) {
    this.engine.toggleCell(x, y);
    this.emit(true, 'append');
  }

  redraw() {
    this.emit(false, 'none');
  }

  private emit(trackTransition: boolean, timelineMode: 'append' | 'reset' | 'none') {
    const cells = this.engine.getCells();
    const stats = trackTransition ? this.calculateStats(cells) : this.lastStats;
    const sample = { generation: this.generation, ...stats };
    this.lastStats = stats;
    if (timelineMode === 'reset') this.statsTimeline.reset(sample);
    else if (timelineMode === 'append') this.statsTimeline.append(sample);

    this.onSnapshot({
      engine: this.config.engine,
      generation: this.generation,
      width: this.config.width,
      height: this.config.height,
      cells,
      ...stats,
      statsHistory: this.statsTimeline.snapshot(),
    });
    if (trackTransition) this.previousCells = new Uint8Array(cells);
  }

  private calculateStats(cells: Uint8Array) {
    let population = 0;
    let births = 0;
    let deaths = 0;
    const previous = this.previousCells;
    for (let i = 0; i < cells.length; i++) {
      const alive = cells[i] === 1;
      const wasAlive = previous?.[i] === 1;
      if (alive) population++;
      if (!previous) continue;
      if (alive && !wasAlive) births++;
      else if (!alive && wasAlive) deaths++;
    }
    return { population, births, deaths, delta: births - deaths };
  }
}
