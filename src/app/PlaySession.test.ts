import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, type GameConfig } from './Config';
import { PlaySession } from './PlaySession';
import type { LifeEngine } from '../engines/LifeEngine';

class FakeEngine implements LifeEngine {
  readonly kind = 'js' as const;
  cells = new Uint8Array(4);
  steps = 0;
  cleared = false;
  randomizedWith: number | undefined;

  width() { return 2; }
  height() { return 2; }
  step() { this.steps++; }
  clear() { this.cleared = true; this.cells.fill(0); }
  randomize(density: number) { this.randomizedWith = density; }
  setCell(x: number, y: number, alive: boolean) { if (x >= 0 && y >= 0 && x < 2 && y < 2) this.cells[y * 2 + x] = alive ? 1 : 0; }
  toggleCell(x: number, y: number) { if (x >= 0 && y >= 0 && x < 2 && y < 2) this.cells[y * 2 + x] = this.cells[y * 2 + x] ? 0 : 1; }
  getCells() { return this.cells; }
}

const config = (): GameConfig => ({ ...DEFAULT_CONFIG, width: 2, height: 2, engine: 'js', randomDensity: 0.4 });

describe('PlaySession', () => {
  it('starts by creating an engine, randomizing, and emitting a generation-zero snapshot', async () => {
    const engine = new FakeEngine();
    const snapshots: Array<{ generation: number; cells: Uint8Array }> = [];
    const session = new PlaySession(config(), async () => engine, (snapshot) => snapshots.push(snapshot), (() => 1) as typeof window.setInterval, (() => {}) as typeof window.clearInterval);

    await session.start('js');

    expect(engine.randomizedWith).toBe(0.4);
    expect(snapshots.at(-1)?.generation).toBe(0);
    expect(snapshots.at(-1)?.cells).toBe(engine.cells);
  });

  it('owns stepping and generation count behind one interface', async () => {
    const engine = new FakeEngine();
    const generations: number[] = [];
    const session = new PlaySession(config(), async () => engine, (snapshot) => generations.push(snapshot.generation), (() => 1) as typeof window.setInterval, (() => {}) as typeof window.clearInterval);
    await session.switchEngine('js');

    session.step();
    session.step();

    expect(engine.steps).toBe(2);
    expect(generations).toEqual([0, 1, 2]);
  });

  it('stops playback when clearing', async () => {
    const engine = new FakeEngine();
    let clearedTimer: number | undefined;
    const session = new PlaySession(config(), async () => engine, () => {}, (() => 7) as typeof window.setInterval, ((timer) => { clearedTimer = timer; }) as typeof window.clearInterval);
    await session.switchEngine('js');

    session.play();
    session.clear();

    expect(clearedTimer).toBe(7);
    expect(session.isPlaying()).toBe(false);
    expect(engine.cleared).toBe(true);
  });
});
