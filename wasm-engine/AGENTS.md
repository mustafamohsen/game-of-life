# WebAssembly Engine Agent Instructions

## Purpose

- Owns the Rust implementation of the Game of Life engine compiled to WebAssembly.
- Produces the generated package consumed by the Vite frontend from `wasm-engine/pkg/`.

## Ownership

- `src/lib.rs` owns Rust simulation behavior and wasm-bindgen exports.
- `Cargo.toml` and `Cargo.lock` own Rust package configuration.
- `pkg/` contains generated WebAssembly artifacts from `wasm-pack build wasm-engine --target web --out-dir pkg`.
- `target/` is build output and should not be edited manually.

## Local Contracts

- Keep exported APIs compatible with `src/engines/WasmLifeEngine.ts` unless updating both sides together.
- Do not hand-edit generated files in `pkg/`; regenerate them with `wasm-pack`.
- Keep Rust and TypeScript engine behavior aligned for rule masks, wrapping, randomization, and cell indexing.

## Work Guidance

- Use Rust tests for engine logic where practical.
- If generated `pkg/` output changes only because of tool ordering/no-op rebuilds, avoid committing those artifacts unless needed for a real source change.

## Verification

- Run `cargo test --manifest-path wasm-engine/Cargo.toml` for Rust engine changes.
- Run `bun run build` when generated WebAssembly package or frontend integration changes.

## Child DOX Index

- No child AGENTS.md files currently. This document owns all `wasm-engine/` paths.
