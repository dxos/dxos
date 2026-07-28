---
'@dxos/cli': patch
---

Fix `@dxos/cli` being unable to run at all when installed from npm. The compiled binary no longer
marks modules external (which made startup fail resolving `@dxos/react-ui-attention/types` and
`esbuild-wasm/esbuild.wasm?url` from inside the binary), bundles `@dxos/node-std` and the Subduction
WASM in forms that survive compilation, keeps its executable bit through publishing, and is built
with a bun version that no longer leaks `--smol` into `process.argv` — which made `dx` reject its own
arguments. Persistent SQLite storage now creates its parent directory on bun, so any `dx` command
works on a machine that has not stored a profile yet.
