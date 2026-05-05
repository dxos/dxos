//
// Copyright 2026 DXOS.org
//

// NOTE: Workerd-safe stub for `@dxos/vendor-hypercore/hypercore`.
//
// The full bundle (`./dist/lib/browser/hypercore.mjs`) embeds `hypercore-crypto`
// which transitively pulls `sodium-javascript` -> `sha512-universal` ->
// `sha512-wasm`. `sha512-wasm/sha512.js` calls `new WebAssembly.Module(buffer)`
// at top level, which Cloudflare `workerd` blocks with `CompileError: Wasm code
// generation disallowed by embedder`. Any worker bundle that statically imports
// `@dxos/vendor-hypercore/hypercore` therefore fails to boot.
//
// This stub keeps the import graph intact so module loading succeeds. Any
// runtime call into hypercore in workerd is unsupported (the worker does not
// own hypercore feeds at runtime — feed replication runs out-of-process / via
// service bindings).

const unsupported = () => {
  throw new Error('@dxos/vendor-hypercore/hypercore is not available in this runtime (workerd stub).');
};

const hypercoreStub = unsupported;

export default hypercoreStub;
