# Source Agent Instructions

## Purpose

- Owns the TypeScript/Vite frontend for the Game of Life simulator.
- Contains app state, UI controls, renderers, engine adapters, patterns, styles, and tests.

## Ownership

- `app/` owns controller/UI orchestration, configuration, pattern data, play sessions, and statistics.
- `engines/` owns the shared engine interface plus TypeScript and WebAssembly-backed engine adapters.
- `rendering/` owns canvas drawing.
- `styles.css` owns the application visual system and responsive layout.

## Local Contracts

- Keep rule presets centralized in `app/Config.ts` and consume them from UI and engines rather than duplicating rule data.
- Keep engine behavior behind `engines/LifeEngine.ts` so TypeScript and WASM engines remain swappable.
- UI code should remain keyboard/accessibility aware when adding controls or dialogs.

## Work Guidance

- Use Bun scripts for validation.
- Prefer small, focused TypeScript modules over expanding `GameController.ts` unless the change is tightly UI-orchestration related.
- Preserve existing visual language: dark interface, compact controls, canvas-first layout.

## Verification

- Run `bun test` for engine/session behavior changes.
- Run `bun run build` for UI, config, TypeScript, or WASM integration changes when practical.

## Child DOX Index

- No child AGENTS.md files currently. This document owns all `src/` paths.
