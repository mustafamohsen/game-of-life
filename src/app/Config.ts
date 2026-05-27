export type EngineKind = "wasm" | "js";

export type GameConfig = {
  width: number;
  height: number;
  cellSize: number;
  tickRateMs: number;
  wrapEdges: boolean;
  randomDensity: number;
  survivalRules: number[];
  birthRules: number[];
  engine: EngineKind;
  showGrid: boolean;
  colorizeStates: boolean;
  colors: {
    background: string;
    alive: string;
    grid: string;
  };
};

export const RULE_PRESETS = {
  conway: { label: "Conway B3/S23", birth: [3], survival: [2, 3] },
  highLife: { label: "HighLife B36/S23", birth: [3, 6], survival: [2, 3] },
  seeds: { label: "Seeds B2/S", birth: [2], survival: [] },
  dayAndNight: {
    label: "Day & Night B3678/S34678",
    birth: [3, 6, 7, 8],
    survival: [3, 4, 6, 7, 8],
  },
} as const;

export const DEFAULT_CONFIG: GameConfig = {
  width: 100,
  height: 70,
  cellSize: 10,
  tickRateMs: 80,
  wrapEdges: true,
  randomDensity: 0.25,
  birthRules: [...RULE_PRESETS.conway.birth],
  survivalRules: [...RULE_PRESETS.conway.survival],
  engine: "wasm",
  showGrid: true,
  colorizeStates: false,
  colors: {
    background: "#050608",
    alive: "#c8ccd2",
    grid: "rgba(150, 170, 195, 0.08)",
  },
};

export function ruleMask(rules: number[]): number {
  return rules.reduce((mask, n) => (n >= 0 && n <= 8 ? mask | (1 << n) : mask), 0);
}
