//
// Copyright 2022 DXOS.org
//

/// <reference types="vite-plugin-pwa/client" />

// Support for Vite raw imports.
declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*.json?raw' {
  const content: string;
  export default content;
}

// Support for Vite asset-url imports (the automerge wasm binaries).
declare module '*.wasm?url' {
  const url: string;
  export default url;
}

declare module '*/wasm?url' {
  const url: string;
  export default url;
}
