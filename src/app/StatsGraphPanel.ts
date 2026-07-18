import { buildEventMarkers, buildLinePath } from "./StatsChart";
import type { SessionSnapshot } from "./PlaySession";
import type { StatsSample } from "./StatsTimeline";

const CHART_WIDTH = 320;
const POPULATION_CHART_HEIGHT = 96;
const FLOW_CHART_HEIGHT = 72;
const DENSITY_CHART_HEIGHT = 56;

export type LifeStatsEventDetail = {
  latest: SessionSnapshot;
  history: readonly StatsSample[];
};

declare global {
  interface HTMLElementEventMap {
    "life:stats": CustomEvent<LifeStatsEventDetail>;
  }
}

export class StatsGraphPanel {
  private readonly panel: HTMLElement;
  private readonly populationPath: SVGPathElement;
  private readonly birthsPath: SVGPathElement;
  private readonly deathsPath: SVGPathElement;
  private readonly populationValue: HTMLElement;
  private readonly birthsValue: HTMLElement;
  private readonly deathsValue: HTMLElement;
  private readonly deltaValue: HTMLElement;
  private readonly densityValue: HTMLElement;
  private readonly periodValue: HTMLElement;
  private readonly densityPath: SVGPathElement;
  private readonly eventLayer: SVGGElement;
  private readonly toggle: HTMLButtonElement;
  private readonly samplesValue: HTMLElement;

  constructor(private readonly root: HTMLElement) {
    this.panel = root.querySelector<HTMLElement>("#stats-panel")!;
    this.populationPath = root.querySelector<SVGPathElement>("#population-path")!;
    this.birthsPath = root.querySelector<SVGPathElement>("#births-path")!;
    this.deathsPath = root.querySelector<SVGPathElement>("#deaths-path")!;
    this.populationValue = root.querySelector<HTMLElement>("#stats-population")!;
    this.birthsValue = root.querySelector<HTMLElement>("#stats-births")!;
    this.deathsValue = root.querySelector<HTMLElement>("#stats-deaths")!;
    this.deltaValue = root.querySelector<HTMLElement>("#stats-delta")!;
    this.densityValue = root.querySelector<HTMLElement>("#stats-density")!;
    this.periodValue = root.querySelector<HTMLElement>("#stats-period")!;
    this.densityPath = root.querySelector<SVGPathElement>("#density-path")!;
    this.eventLayer = root.querySelector<SVGGElement>("#event-markers")!;
    this.toggle = root.querySelector<HTMLButtonElement>("#stats-toggle")!;
    this.samplesValue = root.querySelector<HTMLElement>("#stats-samples")!;
    this.toggle.onclick = () => this.togglePanel();
    root.addEventListener("life:stats", (event) => this.render(event.detail.history));
  }

  togglePanel(): void {
    const hidden = this.panel.toggleAttribute("hidden");
    this.toggle.setAttribute("aria-expanded", String(!hidden));
  }

  private render(history: readonly StatsSample[]): void {
    const latest = history.at(-1);
    if (!latest) return;
    this.populationValue.textContent = String(latest.population);
    this.birthsValue.textContent = String(latest.births);
    this.deathsValue.textContent = String(latest.deaths);
    this.deltaValue.textContent = `${latest.delta >= 0 ? "+" : ""}${latest.delta}`;
    this.densityValue.textContent = `${Math.round(latest.density * 100)}%`;
    this.periodValue.textContent = latest.period ? String(latest.period) : "—";
    this.samplesValue.textContent = `${history.length} sample${history.length === 1 ? "" : "s"}`;
    this.populationPath.setAttribute(
      "d",
      buildLinePath(
        history.map((sample) => sample.population),
        CHART_WIDTH,
        POPULATION_CHART_HEIGHT,
      ),
    );
    const maxFlow = Math.max(1, ...history.flatMap((sample) => [sample.births, sample.deaths]));
    this.birthsPath.setAttribute(
      "d",
      buildLinePath(
        history.map((sample) => sample.births),
        CHART_WIDTH,
        FLOW_CHART_HEIGHT,
        maxFlow,
      ),
    );
    this.deathsPath.setAttribute(
      "d",
      buildLinePath(
        history.map((sample) => sample.deaths),
        CHART_WIDTH,
        FLOW_CHART_HEIGHT,
        maxFlow,
      ),
    );
    this.densityPath.setAttribute(
      "d",
      buildLinePath(
        history.map((sample) => sample.density),
        CHART_WIDTH,
        DENSITY_CHART_HEIGHT,
        1,
      ),
    );
    this.eventLayer.innerHTML = buildEventMarkers(
      history,
      CHART_WIDTH,
      POPULATION_CHART_HEIGHT,
    );
  }
}
