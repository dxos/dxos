//
// Copyright 2023 DXOS.org
//

// https://vitejs.dev/guide/env-and-mode.html#intellisense-for-typescript

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV: string;
  readonly VITE_DEBUG: string;
  readonly VITE_PWA: string;
}

export interface ImportMeta {
  readonly env: ImportMetaEnv;
}
