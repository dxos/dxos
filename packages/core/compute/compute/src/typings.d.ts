//
// Copyright 2026 DXOS.org
//

// TypeScript cannot resolve Vite's `?raw` suffix and vite is not a dependency of this package.

declare module '*.sql?raw' {
  const content: string;
  export default content;
}
