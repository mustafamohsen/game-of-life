# Agent Instructions

- Use Bun for JavaScript/TypeScript package management and scripts; do not use npm for this project.
- Use conventional commits for all git commits, e.g. `feat: ...`, `fix: ...`, `chore: ...`, `docs: ...`, `test: ...`.
- Commit often without waiting for explicit user permission, as long as the change is coherent and validation has been run when practical.
- Keep commits atomic: each commit should represent one coherent change.
- Run relevant validation before committing when possible:
  - `bun test`
  - `bun run build`
  - `cargo test --manifest-path wasm-engine/Cargo.toml`
- The Rust WebAssembly package is built with `wasm-pack build wasm-engine --target web --out-dir pkg`.
