/* tslint:disable */
/* eslint-disable */
export class Universe {
  free(): void;
  constructor(width: number, height: number, wrap_edges: boolean, birth_mask: number, survival_mask: number);
  width(): number;
  height(): number;
  cells_ptr(): number;
  len(): number;
  clear(): void;
  randomize(density: number): void;
  set_cell(x: number, y: number, alive: boolean): void;
  toggle_cell(x: number, y: number): void;
  step(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_universe_free: (a: number, b: number) => void;
  readonly universe_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly universe_width: (a: number) => number;
  readonly universe_height: (a: number) => number;
  readonly universe_cells_ptr: (a: number) => number;
  readonly universe_len: (a: number) => number;
  readonly universe_clear: (a: number) => void;
  readonly universe_randomize: (a: number, b: number) => void;
  readonly universe_set_cell: (a: number, b: number, c: number, d: number) => void;
  readonly universe_toggle_cell: (a: number, b: number, c: number) => void;
  readonly universe_step: (a: number) => void;
  readonly __wbindgen_export_0: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
