import type { StatsSample } from './StatsTimeline';

export class StatsGraphPanel {
  private history: readonly StatsSample[] = [];
  private panel: HTMLElement;
  private populationPath: SVGPathElement;
  private birthsPath: SVGPathElement;
  private deathsPath: SVGPathElement;
  private populationValue: HTMLElement;
  private birthsValue: HTMLElement;
  private deathsValue: HTMLElement;
  private deltaValue: HTMLElement;
  private densityValue: HTMLElement;
  private periodValue: HTMLElement;
  private densityPath: SVGPathElement;
  private eventLayer: SVGGElement;
  private toggle: HTMLButtonElement;
  private samplesValue: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    this.panel = root.querySelector<HTMLElement>('#stats-panel')!;
    this.populationPath = root.querySelector<SVGPathElement>('#population-path')!;
    this.birthsPath = root.querySelector<SVGPathElement>('#births-path')!;
    this.deathsPath = root.querySelector<SVGPathElement>('#deaths-path')!;
    this.populationValue = root.querySelector<HTMLElement>('#stats-population')!;
    this.birthsValue = root.querySelector<HTMLElement>('#stats-births')!;
    this.deathsValue = root.querySelector<HTMLElement>('#stats-deaths')!;
    this.deltaValue = root.querySelector<HTMLElement>('#stats-delta')!;
    this.densityValue = root.querySelector<HTMLElement>('#stats-density')!;
    this.periodValue = root.querySelector<HTMLElement>('#stats-period')!;
    this.densityPath = root.querySelector<SVGPathElement>('#density-path')!;
    this.eventLayer = root.querySelector<SVGGElement>('#event-markers')!;
    this.toggle = root.querySelector<HTMLButtonElement>('#stats-toggle')!;
    this.samplesValue = root.querySelector<HTMLElement>('#stats-samples')!;
    this.toggle.onclick = () => this.togglePanel();
    root.addEventListener('life:stats', (event) => {
      const detail = (event as CustomEvent<{ history: readonly StatsSample[] }>).detail;
      this.render(detail.history);
    });
  }

  private togglePanel() {
    const hidden = this.panel.toggleAttribute('hidden');
    this.toggle.setAttribute('aria-expanded', String(!hidden));
  }

  private render(history: readonly StatsSample[]) {
    this.history = history;
    const latest = history.at(-1);
    if (!latest) return;
    this.populationValue.textContent = String(latest.population);
    this.birthsValue.textContent = String(latest.births);
    this.deathsValue.textContent = String(latest.deaths);
    this.deltaValue.textContent = `${latest.delta >= 0 ? '+' : ''}${latest.delta}`;
    this.densityValue.textContent = `${Math.round(latest.density * 100)}%`;
    this.periodValue.textContent = latest.period ? String(latest.period) : '—';
    this.samplesValue.textContent = `${history.length} sample${history.length === 1 ? '' : 's'}`;
    this.populationPath.setAttribute('d', this.linePath(history.map((sample) => sample.population), 320, 96));
    const maxFlow = Math.max(1, ...history.flatMap((sample) => [sample.births, sample.deaths]));
    this.birthsPath.setAttribute('d', this.linePath(history.map((sample) => sample.births), 320, 72, maxFlow));
    this.deathsPath.setAttribute('d', this.linePath(history.map((sample) => sample.deaths), 320, 72, maxFlow));
    this.densityPath.setAttribute('d', this.linePath(history.map((sample) => sample.density), 320, 56, 1));
    this.eventLayer.innerHTML = this.eventMarkers(history, 320, 96);
  }

  private eventMarkers(history: readonly StatsSample[], width: number, height: number) {
    if (history.length <= 1) return '';
    return history.flatMap((sample, index) => {
      if (!sample.event || sample.event === 'step') return [];
      const x = (index / (history.length - 1)) * width;
      return `<line x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="0" y2="${height}" />`;
    }).join('');
  }

  private linePath(values: readonly number[], width: number, height: number, forcedMax?: number) {
    if (values.length === 0) return '';
    if (values.length === 1) return `M 0 ${height} L ${width} ${height}`;
    const max = forcedMax ?? Math.max(1, ...values);
    return values.map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / max) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    }).join(' ');
  }
}
