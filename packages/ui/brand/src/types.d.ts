//
// Copyright 2022 DXOS.org
//

// Vite resolves audio imports to asset URLs at build/serve time.
declare module '*.mp3' {
  const src: string;
  export default src;
}

// Vite inlines `?raw` imports as strings, so SVGs can be embedded and themed via CSS variables.
declare module '*?raw' {
  const content: string;
  export default content;
}
