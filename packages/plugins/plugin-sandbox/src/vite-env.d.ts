/// <reference types="vite/client" />

//
// Copyright 2026 DXOS.org
//

declare module '*.mdl?raw' {
  const content: string;
  export default content;
}

interface ImportMetaEnv {
  /** Source tree a dev build of Composer was bundled from; see composer-app's `vite.config.ts`. */
  readonly VITE_DX_SOURCE_ROOT?: string;
}
