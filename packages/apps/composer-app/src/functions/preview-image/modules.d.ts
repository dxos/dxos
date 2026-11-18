//
// Copyright 2026 DXOS.org
//

declare module '*.wasm' {
  const module: WebAssembly.Module;
  export default module;
}

declare module '*.woff' {
  const bytes: Uint8Array;
  export default bytes;
}
