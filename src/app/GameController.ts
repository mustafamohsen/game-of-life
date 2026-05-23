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
  private latestCells: Uint8Array | undefined;
  private pendingPattern: LifePattern | undefined;

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
        this.latestCells = snapshot.cells;
        this.renderer.draw(snapshot.cells);
        this.status.innerHTML = `<span>${snapshot.engine.toUpperCase()} · Gen ${snapshot.generation} · ${snapshot.width}×${snapshot.height}</span><span>Pop ${snapshot.population}</span><span>Births ${snapshot.births}</span><span>Deaths ${snapshot.deaths}</span><span>Δ ${snapshot.delta >= 0 ? '+' : ''}${snapshot.delta}</span>`;
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
    this.root.querySelector<HTMLButtonElement>('#clear')!.onclick = () => this.clearWorld();
    this.root.querySelector<HTMLButtonElement>('#random')!.onclick = () => this.randomizeWorld();
    this.root.querySelector<HTMLButtonElement>('#sidebar-toggle')!.onclick = () => this.toggleSidebar();

    const patternDialog = this.root.querySelector<HTMLDialogElement>('#pattern-library')!;
    const patternSearch = this.root.querySelector<HTMLInputElement>('#pattern-search')!;
    this.root.querySelector<HTMLButtonElement>('#open-pattern-library')!.onclick = () => {
      patternDialog.showModal();
      patternSearch.focus();
    };
    this.root.querySelector<HTMLButtonElement>('#close-pattern-library')!.onclick = () => patternDialog.close();
    patternDialog.onclick = (event) => { if (event.target === patternDialog) patternDialog.close(); };
    patternSearch.oninput = () => this.filterPatterns(patternSearch.value);
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-pattern]')) {
      button.onclick = () => {
        this.selectPattern(button.dataset.pattern!);
        patternDialog.close();
      };
    }
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.category-chip')) {
      button.onclick = () => this.setPatternCategory(button.dataset.category!);
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
      this.redrawLatest();
    };
    this.root.querySelector<HTMLInputElement>('#state-colors')!.onchange = (e) => {
      this.config.colorizeStates = (e.target as HTMLInputElement).checked;
      this.redrawLatest();
    };

    let dragging = false;
    canvas.addEventListener('mousedown', (e) => {
      dragging = true;
      if (this.pendingPattern) this.placePendingPattern(e);
      else this.toggleFromMouse(e);
    });
    canvas.addEventListener('mousemove', (e) => {
      if (this.pendingPattern) this.previewPendingPattern(e);
      else if (dragging) this.paintFromMouse(e);
    });
    canvas.addEventListener('mouseleave', () => this.redrawLatest());
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('keydown', (e) => this.handleKeyboard(e));
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

  private clearWorld() {
    this.session.clear();
    this.renderer.resetState(this.latestCells);
    this.redrawLatest();
    this.syncPlayButton();
  }

  private randomizeWorld() {
    this.session.randomize();
    this.renderer.resetState(this.latestCells);
    this.redrawLatest();
  }

  private handleKeyboard(event: KeyboardEvent) {
    const target = event.target as HTMLElement | null;
    if (target?.matches('input, textarea, select, button')) return;

    const key = event.key.toLowerCase();
    if (key === ' ' || key === 'k') {
      event.preventDefault();
      this.togglePlayback();
    } else if (key === 'x' || key === 'backspace') {
      event.preventDefault();
      this.clearWorld();
    } else if (key === 'r') {
      event.preventDefault();
      this.randomizeWorld();
    } else if (key === '[' || key === '-') {
      event.preventDefault();
      this.adjustSpeed(1, event.shiftKey);
    } else if (key === ']' || key === '=' || key === '+') {
      event.preventDefault();
      this.adjustSpeed(-1, event.shiftKey);
    } else if (key === 'f') {
      event.preventDefault();
      this.toggleSidebar();
    } else if (key === 'escape' && this.pendingPattern) {
      event.preventDefault();
      this.cancelPendingPattern();
    }
  }

  private adjustSpeed(direction: 1 | -1, largeStep = false) {
    const input = this.root.querySelector<HTMLInputElement>('#speed')!;
    const min = Number(input.min);
    const max = Number(input.max);
    const step = largeStep ? 50 : 10;
    const next = Math.min(max, Math.max(min, this.config.tickRateMs + direction * step));
    this.config.tickRateMs = next;
    input.value = String(next);
    this.root.querySelector<HTMLElement>('#speed-value')!.textContent = String(next);
    this.session.restartTimer();
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

  private filterPatterns(query: string) {
    const normalized = query.trim().toLowerCase();
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-pattern]')) {
      const haystack = button.dataset.search ?? '';
      const matchesSearch = normalized.length === 0 || haystack.includes(normalized);
      const activeCategory = this.root.querySelector<HTMLButtonElement>('.category-chip.is-active')?.dataset.category ?? 'all';
      const matchesCategory = activeCategory === 'all' || button.dataset.category === activeCategory;
      button.hidden = !matchesSearch || !matchesCategory;
    }
  }

  private setPatternCategory(category: string) {
    for (const button of this.root.querySelectorAll<HTMLButtonElement>('.category-chip')) {
      const active = button.dataset.category === category;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    }
    this.filterPatterns(this.root.querySelector<HTMLInputElement>('#pattern-search')!.value);
  }

  private selectPattern(patternId: string) {
    const pattern = LIFE_PATTERNS.find((candidate) => candidate.id === patternId);
    if (!pattern) return;
    this.pendingPattern = pattern;
    this.root.querySelector<HTMLElement>('#pattern-mode')!.textContent = `Placing ${pattern.name}. Click the field, or press Esc.`;
    this.shell.classList.add('placing-pattern');
  }

  private placePendingPattern(event: MouseEvent) {
    if (!this.pendingPattern) return;
    const [x, y] = this.renderer.cellFromEvent(event);
    this.placePattern(this.pendingPattern, x, y);
    this.cancelPendingPattern();
  }

  private previewPendingPattern(event: MouseEvent) {
    if (!this.pendingPattern || !this.latestCells) return;
    this.renderer.draw(this.latestCells, false);
    const [x, y] = this.renderer.cellFromEvent(event);
    this.renderer.drawPatternPreview(this.pendingPattern.cells, x, y);
  }

  private cancelPendingPattern() {
    this.pendingPattern = undefined;
    this.shell.classList.remove('placing-pattern');
    this.root.querySelector<HTMLElement>('#pattern-mode')!.textContent = 'No pattern selected';
    this.redrawLatest();
  }

  private redrawLatest() {
    if (this.latestCells) this.renderer.draw(this.latestCells, false);
  }

  private toggleFromMouse(e: MouseEvent) { const [x, y] = this.renderer.cellFromEvent(e); this.session.toggleCell(x, y); }
  private paintFromMouse(e: MouseEvent) { const [x, y] = this.renderer.cellFromEvent(e); this.session.setCell(x, y, true); }

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

  private patternCategory(pattern: LifePattern) {
    const text = `${pattern.name} ${pattern.description}`.toLowerCase();
    if (text.includes('gun') || text.includes('unbounded growth')) return 'guns';
    if (text.includes('spaceship') || text.includes('glider')) return 'spaceships';
    if (text.includes('oscillator') || text.includes('period') || text.includes('shuttle')) return 'oscillators';
    if (text.includes('still life')) return 'still-lifes';
    if (text.includes('methuselah') || text.includes('heptomino') || text.includes('pentomino') || text.includes('seed')) return 'seeds';
    return 'guns';
  }

  private patternPreview(pattern: LifePattern) {
    const maxX = Math.max(...pattern.cells.map(([x]) => x));
    const maxY = Math.max(...pattern.cells.map(([, y]) => y));
    const cells = pattern.cells.map(([x, y]) => `<rect x="${x}" y="${y}" width="1" height="1" />`).join('');
    return `<svg class="pattern-preview" viewBox="-1 -1 ${maxX + 3} ${maxY + 3}" aria-hidden="true">${cells}</svg>`;
  }

  private template() {
    const ruleButtons = Object.entries(RULE_PRESETS).map(([key, preset]) => {
      const active = key === 'conway' ? ' is-active' : '';
      return `<button type="button" class="choice${active}" data-rule="${key}" aria-pressed="${key === 'conway'}"><span>${preset.label.split(' ')[0]}</span><small>${preset.label.split(' ').slice(1).join(' ')}</small></button>`;
    }).join('');
    const categories = [
      ['all', 'All'],
      ['spaceships', 'Ships'],
      ['oscillators', 'Oscillators'],
      ['still-lifes', 'Still lifes'],
      ['seeds', 'Seeds'],
      ['guns', 'Guns'],
    ];
    const categoryButtons = categories.map(([id, label], index) => `<button type="button" class="category-chip${index === 0 ? ' is-active' : ''}" data-category="${id}" aria-pressed="${index === 0}">${label}</button>`).join('');
    const patternButtons = LIFE_PATTERNS.map((pattern) => {
      const category = this.patternCategory(pattern);
      return `<button type="button" class="pattern-card" data-pattern="${pattern.id}" data-category="${category}" data-search="${`${pattern.name} ${pattern.description} ${category}`.toLowerCase()}" title="${pattern.description}">${this.patternPreview(pattern)}<span>${pattern.name}</span><small>${pattern.description}</small></button>`;
    }).join('');

    return `<section class="shell">
      <aside id="control-panel" class="panel" aria-label="Simulation controls">
        <strong id="status" class="status-pill"></strong>

        <section class="control-card command-card">
          <div class="card-label">Transport</div>
          <div class="transport-grid">
            <button id="play" class="command primary" type="button" data-state="paused" data-shortcut="Space / K"><span>Play</span></button>
            <button id="step" class="command" type="button"><span>Step</span></button>
            <button id="random" class="command" type="button" data-shortcut="R"><span>Seed</span></button>
            <button id="clear" class="command danger" type="button" data-shortcut="X / Backspace"><span>Wipe</span></button>
          </div>
        </section>

        <section class="control-card patterns">
          <div class="card-label">Pattern deck</div>
          <button id="open-pattern-library" class="pattern-library-trigger" type="button">
            <span>Patterns</span>
            <small>${LIFE_PATTERNS.length} available</small>
          </button>
          <p id="pattern-mode" class="pattern-mode">No pattern selected</p>
          <button id="showcase" class="pattern-card showcase" type="button"><span>Load showcase</span><small>compose a living gallery</small></button>
        </section>

        <section class="control-card slider-bank">
          <div class="card-label">Field geometry</div>
          <label class="control-slider"><span>Width <output id="width-value">${this.config.width}</output></span><input id="width" type="range" min="20" max="220" value="${this.config.width}"></label>
          <label class="control-slider"><span>Height <output id="height-value">${this.config.height}</output></span><input id="height" type="range" min="20" max="160" value="${this.config.height}"></label>
          <label class="control-slider"><span>Cell pitch <output id="cellSize-value">${this.config.cellSize}</output></span><input id="cellSize" type="range" min="3" max="20" value="${this.config.cellSize}"></label>
        </section>

        <section class="control-card slider-bank">
          <div class="card-label">Evolution</div>
          <label class="control-slider hot" data-shortcut="[ slower · ] faster"><span>Tempo <output id="speed-value">${this.config.tickRateMs}</output> ms</span><input id="speed" type="range" min="10" max="500" value="${this.config.tickRateMs}"></label>
          <label class="control-slider hot"><span>Seed density <output id="density-value">${Math.round(this.config.randomDensity*100)}%</output></span><input id="density" type="range" min="1" max="80" value="${Math.round(this.config.randomDensity*100)}"></label>
          <div class="toggle-row">
            <label class="switch"><input id="wrap" type="checkbox" checked><span></span><b>Wrap edges</b></label>
            <label class="switch"><input id="grid" type="checkbox" checked><span></span><b>Show grid</b></label>
            <label class="switch"><input id="state-colors" type="checkbox"><span></span><b>State colors</b></label>
          </div>
        </section>

        <section class="control-card rule-card">
          <div class="card-label">Rule set</div>
          <div class="choice-strip rule-strip" role="group" aria-label="Rules">${ruleButtons}</div>
        </section>

        <section class="engine-card">
          <span class="engine-label">engine</span>
          <div class="engine-toggle" role="group" aria-label="Engine">
            <button type="button" class="choice is-active" data-engine="wasm" aria-pressed="true">Rust</button>
            <button type="button" class="choice" data-engine="js" aria-pressed="false">TS</button>
          </div>
        </section>
      </aside>

      <section class="stage" aria-label="Simulation viewport">
        <div class="stage-chrome">
          <button id="sidebar-toggle" class="sidebar-toggle" type="button" aria-expanded="true" aria-controls="control-panel" aria-label="Hide controls" data-shortcut="F">‹</button>
          <span>field monitor</span>
        </div>
        <div class="canvas-frame">
          <canvas id="life-canvas" aria-label="Game of Life grid"></canvas>
        </div>
      </section>

      <dialog id="pattern-library" class="pattern-library" aria-labelledby="pattern-library-title">
        <div class="library-panel">
          <header class="library-header">
            <div>
              <p class="card-label">Pattern deck</p>
              <h2 id="pattern-library-title">Pattern library</h2>
            </div>
            <button id="close-pattern-library" class="sidebar-toggle" type="button" aria-label="Close pattern library">×</button>
          </header>
          <input id="pattern-search" class="pattern-search" type="search" placeholder="Search gliders, oscillators, still lifes…" autocomplete="off">
          <div class="category-strip" role="group" aria-label="Pattern categories">${categoryButtons}</div>
          <div class="library-grid">${patternButtons}</div>
        </div>
      </dialog>
    </section>`;
  }
}
