//
// Copyright 2026 DXOS.org
//

// Plain JS with a hand-written .d.ts: the package's `/slim` types omit the wasm-bindgen default
// init that its runtime (pinned to the non-browser resolution by `slimWasm` in vite.config.ts)
// re-exports.
export { default } from '@automerge/automerge-subduction/slim';
