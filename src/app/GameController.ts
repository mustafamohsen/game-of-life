import { DEFAULT_CONFIG, RULE_PRESETS, type EngineKind, type GameConfig } from './Config';
import type { LifeEngine } from '../engines/LifeEngine';
import { JsLifeEngine } from '../engines/JsLifeEngine';
import { initWasm, WasmLifeEngine } from '../engines/WasmLifeEngine';
import { CanvasRenderer } from '../rendering/CanvasRenderer';
import { LIFE_PATTERNS, type LifePattern } from './Patterns';
import { PlaySession } from './PlaySession';

export class GameController {
  private config: GameConfig = structuredClone(DEFAULT_CONFIG);
  private renderer: CanvasRenderer;
  private session: PlaySession;
  private status: HTMLElement;
  private playButton: HTMLButtonElement;
  private shell: HTMLElement;

  constructor(private root: HTMLElement) {
    root.innerHTML = this.template();
    const canvas = root.querySelector<HTMLCanvasElement>('#life-canvas')!;
    this.shell = root.querySelector<HTMLElement>('.shell')!;
    this.status = root.querySelector<HTMLElement>('#status')!;
    this.playButton = root.querySelector<HTMLButtonElement>('#play')!;
    this.renderer = new CanvasRenderer(canvas, this.config);
    this.session = new PlaySession(
      this.config,
      (kind, config) => this.createEngine(kind, config),
      (snapshot) => {
        this.renderer.draw(snapshot.cells);
        this.status.textContent = `${snapshot.engine.toUpperCase()} · Generation ${snapshot.generation} · ${snapshot.width}×${snapshot.height}`;
      },
    );
    this.bindControls(canvas);
  }

  async start() {
    await this.session.start(this.config.engine);
  }

  private async createEngine(kind: EngineKind, config: GameConfig): Promise<LifeEngine> {
    try {
      if (kind === 'wasm') {
        await initWasm();
        return new WasmLifeEngine(config);
      }
      return new JsLifeEngine(config);
    } catch (error) {
      console.warn('WASM failed; falling back to JS', error);
      this.setActiveChoice('engine', 'js');
      return new JsLifeEngine({ ...config, engine: 'js' });
    }
  }

  private bindControls(canvas: HTMLCanvasElement) {
    this.playButton.onclick = () => this.togglePlayback();
    this.root.querySelector<HTMLButtonElement>('#step')!.onclick = () => this.session.step();
    this.root.querySelector<HTMLButtonElement>('#clear')!.onclick = () => { this.session.clear(); this.syncPlayButton(); };
    this.root.querySelector<HTMLButtonElement>('#random')!.onclick = () => this.session.randomize();
    this.root.querySelector<HTMLButtonElement>('#sidebar-toggle')!.onclick = () => this.toggleSidebar();

    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-pattern]')) {
      button.onclick = () => this.addPattern(button.dataset.pattern!);
    }
    this.root.querySelector<HTMLButtonElement>('#showcase')!.onclick = () => this.loadShowcase();

    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-engine]')) {
      button.onclick = async () => {
        const engine = button.dataset.engine as EngineKind;
        this.setActiveChoice('engine', engine);
        await this.session.switchEngine(engine);
        this.renderer.resize(this.config);
        this.session.randomize();
        this.syncPlayButton();
      };
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-rule]')) {
      button.onclick = async () => {
        const rule = button.dataset.rule as keyof typeof RULE_PRESETS;
        const preset = RULE_PRESETS[rule];
        this.setActiveChoice('rule', rule);
        this.config.birthRules = [...preset.birth];
        this.config.survivalRules = [...preset.survival];
        await this.rebuildAndRandomize();
      };
    }

    for (const id of ['width', 'height', 'cellSize', 'speed', 'density'] as const) {
      this.root.querySelector<HTMLInputElement>(`#${id}`)!.oninput = async (e) => {
        const v = Number((e.target as HTMLInputElement).value);
        if (id === 'speed') this.config.tickRateMs = v;
        else if (id === 'density') this.config.randomDensity = v / 100;
        else this.config[id] = v;
        this.root.querySelector<HTMLElement>(`#${id}-value`)!.textContent = String(id === 'density' ? `${v}%` : v);
        if (['width', 'height', 'cellSize'].includes(id)) await this.rebuildAndResize();
        if (id === 'speed') this.session.restartTimer();
      };
    }
    this.root.querySelector<HTMLInputElement>('#wrap')!.onchange = async (e) => {
      this.config.wrapEdges = (e.target as HTMLInputElement).checked;
      await this.rebuildAndResize();
    };
    this.root.querySelector<HTMLInputElement>('#grid')!.onchange = (e) => {
      this.config.showGrid = (e.target as HTMLInputElement).checked;
      this.session.redraw();
    };

    let dragging = false;
    canvas.addEventListener('mousedown', (e) => { dragging = true; this.toggleFromMouse(e); });
    canvas.addEventListener('mousemove', (e) => { if (dragging) this.paintFromMouse(e); });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  private async rebuildAndRandomize() {
    await this.rebuildAndResize();
    this.session.randomize();
  }

  private async rebuildAndResize() {
    await this.session.rebuild();
    this.renderer.resize(this.config);
    this.syncPlayButton();
  }

  private togglePlayback() {
    if (this.session.isPlaying()) this.session.stop();
    else this.session.play();
    this.syncPlayButton();
  }

  private syncPlayButton() {
    this.playButton.textContent = this.session.isPlaying() ? 'Pause' : 'Play';
    this.playButton.dataset.state = this.session.isPlaying() ? 'playing' : 'paused';
  }

  private toggleSidebar() {
    const collapsed = this.shell.classList.toggle('sidebar-collapsed');
    const toggle = this.root.querySelector<HTMLButtonElement>('#sidebar-toggle')!;
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.textContent = collapsed ? '☰' : '‹';
    toggle.setAttribute('aria-label', collapsed ? 'Show controls' : 'Hide controls');
  }

  private setActiveChoice(group: 'engine' | 'rule', value: string) {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>(`[data-${group}]`)) {
      const isActive = button.dataset[group] === value;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    }
  }

  private toggleFromMouse(e: MouseEvent) { const [x, y] = this.renderer.cellFromEvent(e); this.session.toggleCell(x, y); }
  private paintFromMouse(e: MouseEvent) { const [x, y] = this.renderer.cellFromEvent(e); this.session.setCell(x, y, true); }

  private addPattern(patternId: string) {
    const pattern = LIFE_PATTERNS.find((candidate) => candidate.id === patternId);
    if (!pattern) return;
    this.placePattern(pattern, Math.floor(this.config.width / 2), Math.floor(this.config.height / 2));
  }

  private loadShowcase() {
    this.session.clear();
    const placements: Array<[LifePattern, number, number]> = [
      [LIFE_PATTERNS[0], Math.floor(this.config.width * 0.12), Math.floor(this.config.height * 0.15)],
      [LIFE_PATTERNS[1], Math.floor(this.config.width * 0.28), Math.floor(this.config.height * 0.2)],
      [LIFE_PATTERNS[2], Math.floor(this.config.width * 0.55), Math.floor(this.config.height * 0.2)],
      [LIFE_PATTERNS[4], Math.floor(this.config.width * 0.18), Math.floor(this.config.height * 0.65)],
      [LIFE_PATTERNS[5], Math.floor(this.config.width * 0.4), Math.floor(this.config.height * 0.7)],
      [LIFE_PATTERNS[6], Math.floor(this.config.width * 0.65), Math.floor(this.config.height * 0.65)],
    ];
    for (const [pattern, x, y] of placements) this.placePattern(pattern, x, y);
    this.syncPlayButton();
  }

  private placePattern(pattern: LifePattern, centerX: number, centerY: number) {
    const maxX = Math.max(...pattern.cells.map(([x]) => x));
    const maxY = Math.max(...pattern.cells.map(([, y]) => y));
    const originX = centerX - Math.floor((maxX + 1) / 2);
    const originY = centerY - Math.floor((maxY + 1) / 2);
    for (const [x, y] of pattern.cells) {
      const targetX = originX + x;
      const targetY = originY + y;
      if (targetX >= 0 && targetY >= 0 && targetX < this.config.width && targetY < this.config.height) {
        this.session.setCell(targetX, targetY, true);
      }
    }
  }

  private template() {
    const ruleButtons = Object.entries(RULE_PRESETS).map(([key, preset]) => {
      const active = key === 'conway' ? ' is-active' : '';
      return `<button type="button" class="choice${active}" data-rule="${key}" aria-pressed="${key === 'conway'}"><span>${preset.label.split(' ')[0]}</span><small>${preset.label.split(' ').slice(1).join(' ')}</small></button>`;
    }).join('');
    const patternButtons = LIFE_PATTERNS.map((pattern) => `<button type="button" class="pattern-card" data-pattern="${pattern.id}" title="${pattern.description}"><span>${pattern.name}</span><small>${pattern.description}</small></button>`).join('');

    return `<section class="shell">
      <aside id="control-panel" class="panel" aria-label="Simulation controls">
        <strong id="status" class="status-pill"></strong>

        <section class="control-card command-card">
          <div class="card-label">Transport</div>
          <div class="transport-grid">
            <button id="play" class="command primary" type="button" data-state="paused"><span>Play</span></button>
            <button id="step" class="command" type="button"><span>Step</span></button>
            <button id="random" class="command" type="button"><span>Seed</span></button>
            <button id="clear" class="command danger" type="button"><span>Wipe</span></button>
          </div>
        </section>

        <section class="control-card patterns">
          <div class="card-label">Pattern deck</div>
          <div class="pattern-buttons">${patternButtons}<button id="showcase" class="pattern-card showcase" type="button"><span>Load showcase</span><small>compose a living gallery</small></button></div>
        </section>

        <section class="control-card slider-bank">
          <div class="card-label">Field geometry</div>
          <label class="control-slider"><span>Width <output id="width-value">${this.config.width}</output></span><input id="width" type="range" min="20" max="220" value="${this.config.width}"></label>
          <label class="control-slider"><span>Height <output id="height-value">${this.config.height}</output></span><input id="height" type="range" min="20" max="160" value="${this.config.height}"></label>
          <label class="control-slider"><span>Cell pitch <output id="cellSize-value">${this.config.cellSize}</output></span><input id="cellSize" type="range" min="3" max="20" value="${this.config.cellSize}"></label>
        </section>

        <section class="control-card slider-bank">
          <div class="card-label">Evolution</div>
          <label class="control-slider hot"><span>Tempo <output id="speed-value">${this.config.tickRateMs}</output> ms</span><input id="speed" type="range" min="10" max="500" value="${this.config.tickRateMs}"></label>
          <label class="control-slider hot"><span>Seed density <output id="density-value">${Math.round(this.config.randomDensity*100)}%</output></span><input id="density" type="range" min="1" max="80" value="${Math.round(this.config.randomDensity*100)}"></label>
          <div class="toggle-row">
            <label class="switch"><input id="wrap" type="checkbox" checked><span></span><b>Wrap edges</b></label>
            <label class="switch"><input id="grid" type="checkbox" checked><span></span><b>Show grid</b></label>
          </div>
        </section>

        <section class="control-card rule-card">
          <div class="card-label">Rule set</div>
          <div class="choice-strip rule-strip" role="group" aria-label="Rules">${ruleButtons}</div>
        </section>

        <section class="control-card engine-card">
          <div class="card-label">Engine</div>
          <div class="choice-strip two-up" role="group" aria-label="Engine">
            <button type="button" class="choice is-active" data-engine="wasm" aria-pressed="true"><span>Rust</span><small>WASM core</small></button>
            <button type="button" class="choice" data-engine="js" aria-pressed="false"><span>TypeScript</span><small>fallback</small></button>
          </div>
        </section>
      </aside>

      <section class="stage" aria-label="Simulation viewport">
        <div class="stage-chrome">
          <button id="sidebar-toggle" class="sidebar-toggle" type="button" aria-expanded="true" aria-controls="control-panel" aria-label="Hide controls">‹</button>
          <span>field monitor</span>
        </div>
        <div class="canvas-frame">
          <canvas id="life-canvas" aria-label="Game of Life grid"></canvas>
        </div>
      </section>
    </section>`;
  }
}
