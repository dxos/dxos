//
// Copyright 2022 DXOS.org
//

/// <reference types="vite-plugin-pwa/client" />

// Support for Vite raw imports.
declare module '*.md?raw' {
  const content: string;
  export default content;
}
