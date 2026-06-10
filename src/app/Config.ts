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
  conway: {
    label: "Conway B3/S23",
    summary: "Balanced classic Life: gliders, oscillators, still lifes.",
    birth: [3],
    survival: [2, 3],
  },
  highLife: {
    label: "HighLife B36/S23",
    summary: "Conway-like with extra six-neighbor births and replicators.",
    birth: [3, 6],
    survival: [2, 3],
  },
  seeds: {
    label: "Seeds B2/S",
    summary: "No survival; every generation is reborn into explosive sparks.",
    birth: [2],
    survival: [],
  },
  dayAndNight: {
    label: "Day & Night B3678/S34678",
    summary: "Symmetric under live/dead inversion; bold islands and voids.",
    birth: [3, 6, 7, 8],
    survival: [3, 4, 6, 7, 8],
  },
  maze: {
    label: "Maze B3/S12345",
    summary: "Dense branching corridors that settle into maze-like walls.",
    birth: [3],
    survival: [1, 2, 3, 4, 5],
  },
  anneal: {
    label: "Anneal B4678/S35678",
    summary: "Noisy starts cool into smooth, organic blobs and boundaries.",
    birth: [4, 6, 7, 8],
    survival: [3, 5, 6, 7, 8],
  },
  replicator: {
    label: "Replicator B1357/S1357",
    summary: "Parity-driven diamonds that copy and interfere with themselves.",
    birth: [1, 3, 5, 7],
    survival: [1, 3, 5, 7],
  },
  lifeWithoutDeath: {
    label: "Life without Death B3/S012345678",
    summary: "Cells never die; growth accumulates into frozen branching forms.",
    birth: [3],
    survival: [0, 1, 2, 3, 4, 5, 6, 7, 8],
  },
  coral: {
    label: "Coral B3/S45678",
    summary: "Slow coral-like fronts with rugged expanding edges.",
    birth: [3],
    survival: [4, 5, 6, 7, 8],
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
