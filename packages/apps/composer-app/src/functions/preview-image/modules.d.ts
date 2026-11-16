//
// Copyright 2026 DXOS.org
//

// How `build:functions` loads these files for the Worker (see `worker-assets.ts`).

declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}

declare module '*.woff' {
  const bytes: Uint8Array;
  export default bytes;
}
