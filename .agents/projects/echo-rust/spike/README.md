# Single-binary spike

Answers one question: do automerge, samod-core and subduction link into one wasm32 binary with one
set of TypeScript bindings? They do. This crate is throwaway evidence for DESIGN.md, not the start
of the real workspace.

## What it links

- `automerge` 0.12 with an ECHO-shaped document (`objects/<id>/{data,meta,system}`, a text field),
  saved and reloaded.
- `samod-core` 0.15: the hub loader, `Hub::handle_event` and `DocumentActor`, so the
  automerge-repo sync protocol is reachable from an export.
- `sedimentree_core` 0.15: fingerprint summary and minimization.
- The upstream `automerge_subduction_wasm` bindings (subduction rev `239c5fc`, the 0.19 line that
  `@automerge/automerge-subduction` publishes) re-exported whole, so every subduction class ships in
  the same module.

## Build and run

```bash
rustup target add wasm32-unknown-unknown
cargo install wasm-bindgen-cli --version 0.2.121 --locked
RUSTFLAGS='--cfg getrandom_backend="wasm_js"' \
  cargo build --release --target wasm32-unknown-unknown
wasm-bindgen --target nodejs --out-dir pkg \
  target/wasm32-unknown-unknown/release/echo_wasm_spike.wasm
node run.cjs ./pkg/echo_wasm_spike.js
```

## Results (2026-10-17, rustc 1.97, opt-level z, LTO, no wasm-opt)

| Artifact                                                | Raw     | gzip -9 |
| ------------------------------------------------------- | ------- | ------- |
| automerge + samod-core + sedimentree                    | 2.11 MB | 610 KB  |
| + full subduction wasm bindings (cargo output)          | 3.87 MB | 1.12 MB |
| + full subduction wasm bindings (after wasm-bindgen)    | 2.88 MB | 915 KB  |
| Today: `automerge.wasm` 3.5.0 + `automerge-subduction.wasm` 0.19.0 | 5.38 MB | 1.75 MB |

The comparison is not like for like. The spike exports only what it calls from automerge, while the
published `automerge.wasm` exports the whole JS API. An ECHO binary is in the same position: JS never
needs raw automerge once the text API in DESIGN.md exists.

`run.cjs` loads the module in 43 ms on Node 22 and calls the spike exports and the subduction
exports (`MemorySigner`, `MemoryStorage`) through one glue file.

## Friction found

1. **automerge version skew.** subduction pins `automerge = "0.11"`, samod-core needs `0.12`. Cargo
   links both. Bumping subduction's workspace pin to 0.12 compiles unchanged and saves only a few
   KB, because `automerge_subduction_wasm` declares automerge (to configure getrandom) but calls
   none of it.
2. **wasm-bindgen is pinned exactly.** subduction requires `wasm-bindgen = "=0.2.121"`, so the ECHO
   crate and the CLI must use that version until subduction moves.
3. **Randomness features.** wasm32 needs `getrandom` 0.2 `js`, 0.3 `wasm_js`, the
   `getrandom_backend="wasm_js"` cfg for 0.3/0.4, and `uuid` `js`. Three getrandom majors are in the
   graph.
4. **samod-core has no subduction.** It speaks only the automerge-repo sync protocol. The
   subduction integration DXOS uses today lives in the JS automerge-repo fork.
5. **Not exercised: samod-core's sync path.** It calls `std::time::Instant::now()`, which panics on
   `wasm32-unknown-unknown`. The spike links that code but `run.cjs` never reaches it.
