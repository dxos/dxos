/// <reference types="vite/client" />

//
// Copyright 2025 DXOS.org
//

declare module '*.mdl?raw' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*.mdl?spec' {
  const file: import('./testing/index.ts').SpecFile;
  export default file;
}
