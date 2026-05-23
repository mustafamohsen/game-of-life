# Game of Life

A configurable browser-based Conway's Game of Life built with TypeScript, Canvas, and a Rust WebAssembly simulation engine.

## Features

- Rust WASM engine for fast simulation
- TypeScript fallback engine
- Canvas rendering
- Configurable grid size, cell size, speed, random density, wrapping, and grid overlay
- Rule presets: Conway, HighLife, Seeds, Day & Night
- Interactive click/drag cell editing

## Requirements

- Bun
- Rust/Cargo
- `wasm-pack`

## Commands

```bash
bun install
bun run dev
bun run build
bun test
cargo test --manifest-path wasm-engine/Cargo.toml
```

`bun run build` rebuilds the Rust WASM package before compiling the Vite app.
