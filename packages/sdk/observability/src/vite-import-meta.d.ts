//
// Copyright 2025 DXOS.org
//

/**
 * Vite replaces `import.meta.env` at build time. Aligns with `vite/client` without taking a Vite dependency.
 * @see https://vitejs.dev/guide/env-and-mode.html
 */
interface ImportMetaEnv {
  readonly DEV: boolean;
  readonly PROD: boolean;
  readonly MODE: string;
  readonly SSR: boolean;
}
