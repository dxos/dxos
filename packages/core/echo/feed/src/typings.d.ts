//
// Copyright 2026 DXOS.org
//

// Vite-isms TypeScript cannot resolve on its own. `vite/client` declares both, but is not in this
// repo's `types`, so each consuming package declares what it uses — as ~83 others do.

declare module '*.sql?raw' {
  const content: string;
  export default content;
}

interface ImportMeta {
  /** Narrowed to the eager, raw form the migration manifest test uses. */
  glob: (pattern: string, options?: { query?: string; eager?: boolean }) => Record<string, unknown>;
}
