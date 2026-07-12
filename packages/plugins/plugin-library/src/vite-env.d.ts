/// <reference types="vite/client" />

//
// Copyright 2026 DXOS.org
//

declare module '*.mdl?raw' {
  const content: string;
  export default content;
}

// foliate-js is an untyped, browser-only ESM package (the `<foliate-view>` web component). It is
// loaded lazily in the EPUB reader; declare the entrypoint so the dynamic import type-checks.
declare module 'foliate-js/view.js';
