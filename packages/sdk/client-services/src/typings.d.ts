//
// Copyright 2020 DXOS.org
//

declare module 'jsondown';

// TypeScript cannot resolve Vite's `?raw` suffix. `vite/client` declares it, but vite is not a
// dependency of this package and is absent from the repo's `types`, so each consumer declares it.
declare module '*.sql?raw' {
  const content: string;
  export default content;
}
