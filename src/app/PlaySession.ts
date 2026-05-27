import type { EngineKind, GameConfig } from "./Config";
import type { LifeEngine } from "../engines/LifeEngine";
import { StatsTimeline, type StatsEvent, type StatsSample } from "./StatsTimeline";

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
  density: number;
  period: number | undefined;
  event: StatsEvent | undefined;
  statsHistory: readonly StatsSample[];
};

export class PlaySession {
  private engine!: LifeEngine;
  private timer: number | undefined;
  private generation = 0;
  private previousCells: Uint8Array | undefined;
  private readonly rewindStack: Uint8Array[] = [];
  private readonly maxRewindStates = 500;
  private lastStats = {
    population: 0,
    births: 0,
    deaths: 0,
    delta: 0,
    density: 0,
    period: undefined as number | undefined,
  };
  private readonly statsTimeline = new StatsTimeline();
  private readonly seenStates = new Map<string, number>();

  constructor(
    private readonly config: GameConfig,
    private readonly createEngine: EngineFactory,
    private readonly onSnapshot: (snapshot: SessionSnapshot) => void,
    private readonly setIntervalFn: typeof window.setInterval = window.setInterval.bind(window),
    private readonly clearIntervalFn: typeof window.clearInterval = window.clearInterval.bind(
      window,
    ),
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
    this.rewindStack.length = 0;
    this.seenStates.clear();
    this.emit(true, "reset", "rebuild");
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
    this.pushRewindState();
    this.engine.step();
    this.generation++;
    this.emit(true, "append", "step");
  }

  stepBack() {
    const previous = this.rewindStack.pop();
    if (!previous) return false;
    this.stop();
    this.restoreCells(previous);
    this.generation = Math.max(0, this.generation - 1);
    this.seenStates.clear();
    this.emit(true, "append", "rewind");
    return true;
  }

  canStepBack() {
    return this.rewindStack.length > 0;
  }

  clear() {
    this.stop();
    this.engine.clear();
    this.generation = 0;
    this.previousCells = undefined;
    this.rewindStack.length = 0;
    this.seenStates.clear();
    this.emit(true, "reset", "wipe");
  }

  randomize(density = this.config.randomDensity) {
    this.engine.randomize(density);
    this.generation = 0;
    this.previousCells = undefined;
    this.rewindStack.length = 0;
    this.seenStates.clear();
    this.emit(true, "reset", "seed");
  }

  setCell(x: number, y: number, alive: boolean, event: StatsEvent = "edit") {
    this.engine.setCell(x, y, alive);
    this.emit(true, "append", event);
  }

  toggleCell(x: number, y: number) {
    this.engine.toggleCell(x, y);
    this.emit(true, "append", "edit");
  }

  redraw() {
    this.emit(false, "none");
  }

  private pushRewindState() {
    this.rewindStack.push(new Uint8Array(this.engine.getCells()));
    if (this.rewindStack.length > this.maxRewindStates) this.rewindStack.shift();
  }

  private restoreCells(cells: Uint8Array) {
    this.engine.clear();
    const width = this.config.width;
    for (let index = 0; index < cells.length; index++) {
      if (cells[index] !== 1) continue;
      this.engine.setCell(index % width, Math.floor(index / width), true);
    }
  }

  private emit(
    trackTransition: boolean,
    timelineMode: "append" | "reset" | "none",
    event?: StatsEvent,
  ) {
    const cells = this.engine.getCells();
    const stats = trackTransition ? this.calculateStats(cells) : this.lastStats;
    const sample = { generation: this.generation, ...stats, event };
    this.lastStats = stats;
    if (timelineMode === "reset") this.statsTimeline.reset(sample);
    else if (timelineMode === "append") this.statsTimeline.append(sample);

    this.onSnapshot({
      engine: this.config.engine,
      generation: this.generation,
      width: this.config.width,
      height: this.config.height,
      cells,
      ...stats,
      event,
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
    const density = population / cells.length;
    const period = this.detectPeriod(cells);
    return { population, births, deaths, delta: births - deaths, density, period };
  }

  private detectPeriod(cells: Uint8Array) {
    const hash = this.hashCells(cells);
    const previousGeneration = this.seenStates.get(hash);
    this.seenStates.set(hash, this.generation);
    return previousGeneration === undefined ? undefined : this.generation - previousGeneration;
  }

  private hashCells(cells: Uint8Array) {
    let hash = 2166136261;
    for (let i = 0; i < cells.length; i++) {
      hash ^= cells[i];
      hash = Math.imul(hash, 16777619);
    }
    return hash.toString(36);
  }
}
