//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

/** Virtual CSS entry from the theme vite plugin. */
declare module '@dxos-theme';

interface ImportMetaEnv {
  /** The host the landing page posts shares to, in place of its own; for a dev server with no Worker. */
  readonly VITE_DRAWING_APP_URL?: string;
}
