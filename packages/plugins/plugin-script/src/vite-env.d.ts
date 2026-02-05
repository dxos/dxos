/// <reference types="vite/client" />

//
// Copyright 2025 DXOS.org
//

declare module '*.txt?raw' {
  const content: string;
  export default content;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}

declare module '*?raw' {
  const content: string;
  export default content;
}

declare module 'https://*';
