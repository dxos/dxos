//
// Copyright 2026 DXOS.org
//

// TypeScript cannot resolve Vite's `?raw` suffix. `vite/client` declares it, but vite is not a
// dependency of this package and is absent from the repo's `types`, so each consumer declares what
// it uses — as ~83 others do.

declare module '*.sql?raw' {
  const content: string;
  export default content;
}
