import { DEFAULT_CONFIG, RULE_PRESETS, type EngineKind, type GameConfig } from './Config';
import type { LifeEngine } from '../engines/LifeEngine';
import { JsLifeEngine } from '../engines/JsLifeEngine';
import { initWasm, WasmLifeEngine } from '../engines/WasmLifeEngine';
import { CanvasRenderer } from '../rendering/CanvasRenderer';

export class GameController {
  private config: GameConfig = structuredClone(DEFAULT_CONFIG);
  private engine!: LifeEngine;
  private renderer: CanvasRenderer;
  private timer: number | undefined;
  private generation = 0;
  private status: HTMLElement;

  constructor(private root: HTMLElement) {
    root.innerHTML = this.template();
    const canvas = root.querySelector<HTMLCanvasElement>('#life-canvas')!;
    this.status = root.querySelector<HTMLElement>('#status')!;
    this.renderer = new CanvasRenderer(canvas, this.config);
    this.bindControls(canvas);
  }

  async start() {
    await this.createEngine(this.config.engine);
    this.engine.randomize(this.config.randomDensity);
    this.draw();
  }

  private async createEngine(kind: EngineKind) {
    this.stop();
    this.config.engine = kind;
    try {
      if (kind === 'wasm') {
        await initWasm();
        this.engine = new WasmLifeEngine(this.config);
      } else this.engine = new JsLifeEngine(this.config);
    } catch (error) {
      console.warn('WASM failed; falling back to JS', error);
      this.config.engine = 'js';
      this.engine = new JsLifeEngine(this.config);
      const select = this.root.querySelector<HTMLSelectElement>('#engine')!;
      select.value = 'js';
    }
    this.generation = 0;
    this.renderer.resize(this.config);
  }

  private bindControls(canvas: HTMLCanvasElement) {
    this.root.querySelector<HTMLButtonElement>('#play')!.onclick = () => this.timer ? this.stop() : this.play();
    this.root.querySelector<HTMLButtonElement>('#step')!.onclick = () => this.tick();
    this.root.querySelector<HTMLButtonElement>('#clear')!.onclick = () => { this.stop(); this.engine.clear(); this.generation = 0; this.draw(); };
    this.root.querySelector<HTMLButtonElement>('#random')!.onclick = () => { this.engine.randomize(this.config.randomDensity); this.generation = 0; this.draw(); };

    this.root.querySelector<HTMLSelectElement>('#engine')!.onchange = async (e) => { await this.createEngine((e.target as HTMLSelectElement).value as EngineKind); this.engine.randomize(this.config.randomDensity); this.draw(); };
    this.root.querySelector<HTMLSelectElement>('#rules')!.onchange = async (e) => {
      const preset = RULE_PRESETS[(e.target as HTMLSelectElement).value as keyof typeof RULE_PRESETS];
      this.config.birthRules = [...preset.birth]; this.config.survivalRules = [...preset.survival];
      await this.createEngine(this.config.engine); this.engine.randomize(this.config.randomDensity); this.draw();
    };

    for (const id of ['width', 'height', 'cellSize', 'speed', 'density'] as const) {
      this.root.querySelector<HTMLInputElement>(`#${id}`)!.oninput = async (e) => {
        const v = Number((e.target as HTMLInputElement).value);
        if (id === 'speed') this.config.tickRateMs = v;
        else if (id === 'density') this.config.randomDensity = v / 100;
        else this.config[id] = v;
        this.root.querySelector<HTMLElement>(`#${id}-value`)!.textContent = String(id === 'density' ? `${v}%` : v);
        if (['width', 'height', 'cellSize'].includes(id)) { await this.createEngine(this.config.engine); this.draw(); }
        if (this.timer && id === 'speed') { this.stop(); this.play(); }
      };
    }
    this.root.querySelector<HTMLInputElement>('#wrap')!.onchange = async (e) => { this.config.wrapEdges = (e.target as HTMLInputElement).checked; await this.createEngine(this.config.engine); this.draw(); };
    this.root.querySelector<HTMLInputElement>('#grid')!.onchange = (e) => { this.config.showGrid = (e.target as HTMLInputElement).checked; this.draw(); };

    let dragging = false;
    canvas.addEventListener('mousedown', (e) => { dragging = true; this.toggleFromMouse(e); });
    canvas.addEventListener('mousemove', (e) => { if (dragging) this.paintFromMouse(e); });
    window.addEventListener('mouseup', () => { dragging = false; });
  }

  private toggleFromMouse(e: MouseEvent) { const [x, y] = this.renderer.cellFromEvent(e); this.engine.toggleCell(x, y); this.draw(); }
  private paintFromMouse(e: MouseEvent) { const [x, y] = this.renderer.cellFromEvent(e); this.engine.setCell(x, y, true); this.draw(); }
  private play() { this.timer = window.setInterval(() => this.tick(), this.config.tickRateMs); this.root.querySelector<HTMLButtonElement>('#play')!.textContent = 'Pause'; }
  private stop() { if (this.timer) window.clearInterval(this.timer); this.timer = undefined; const b = this.root.querySelector<HTMLButtonElement>('#play'); if (b) b.textContent = 'Play'; }
  private tick() { this.engine.step(); this.generation++; this.draw(); }
  private draw() { this.renderer.draw(this.engine.getCells()); this.status.textContent = `${this.config.engine.toUpperCase()} · Generation ${this.generation} · ${this.config.width}×${this.config.height}`; }

  private template() { return `<section class="shell"><header><h1>Game of Life</h1><p>TypeScript UI with a Rust WASM simulation engine.</p></header><div class="panel"><div class="buttons"><button id="play">Play</button><button id="step">Step</button><button id="random">Randomize</button><button id="clear">Clear</button></div><label>Engine <select id="engine"><option value="wasm">Rust WASM</option><option value="js">TypeScript</option></select></label><label>Rules <select id="rules">${Object.entries(RULE_PRESETS).map(([k,v]) => `<option value="${k}">${v.label}</option>`).join('')}</select></label><label>Width <span id="width-value">${this.config.width}</span><input id="width" type="range" min="20" max="220" value="${this.config.width}"></label><label>Height <span id="height-value">${this.config.height}</span><input id="height" type="range" min="20" max="160" value="${this.config.height}"></label><label>Cell size <span id="cellSize-value">${this.config.cellSize}</span><input id="cellSize" type="range" min="3" max="20" value="${this.config.cellSize}"></label><label>Speed ms <span id="speed-value">${this.config.tickRateMs}</span><input id="speed" type="range" min="10" max="500" value="${this.config.tickRateMs}"></label><label>Density <span id="density-value">${Math.round(this.config.randomDensity*100)}%</span><input id="density" type="range" min="1" max="80" value="${Math.round(this.config.randomDensity*100)}"></label><label class="check"><input id="wrap" type="checkbox" checked> Wrap edges</label><label class="check"><input id="grid" type="checkbox" checked> Show grid</label><strong id="status"></strong></div><canvas id="life-canvas" aria-label="Game of Life grid"></canvas></section>`; }
}
