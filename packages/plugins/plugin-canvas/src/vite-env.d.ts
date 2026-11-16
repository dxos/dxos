//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

declare module '*.diagram?raw' {
  const text: string;
  export default text;
}

declare module '*.json?raw' {
  const text: string;
  export default text;
}

declare module '*.generator.ts?raw' {
  const text: string;
  export default text;
}
