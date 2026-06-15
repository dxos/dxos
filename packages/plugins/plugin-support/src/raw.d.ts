//
// Copyright 2026 DXOS.org
//

// Vite raw imports — blueprint instructions are authored in markdown and inlined at build time.
declare module '*.md?raw' {
  const content: string;
  export default content;
}
