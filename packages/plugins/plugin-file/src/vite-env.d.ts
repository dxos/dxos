/// <reference types="vite/client" />

//
// Copyright 2026 DXOS.org
//

declare module '*.mdl?raw' {
  const content: string;
  export default content;
}

declare module '*.mjs?url' {
  const src: string;
  export default src;
}

declare module '*.pdf?url' {
  const src: string;
  export default src;
}

declare module '*.pdf?inline' {
  const dataUrl: string;
  export default dataUrl;
}
