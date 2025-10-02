//
// Copyright 2025 DXOS.org
//

/// <reference types="vite/client" />

interface ViteTypeOptions {
  // By adding this line, you can make the type of ImportMetaEnv strict
  // to disallow unknown keys.
  // strictImportMetaEnv: unknown
}

interface ImportMetaEnv {
  readonly VITE_LINEAR_API_KEY: string | undefined;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.wav' {
  const src: string;
  export default src;
}

declare module '*?raw' {
  const content: string;
  export default content;
}
