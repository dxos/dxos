//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The sync server's origin, when it is deployed apart from the app; the app's own origin otherwise. */
  readonly VITE_SYNC_URL?: string;
}
