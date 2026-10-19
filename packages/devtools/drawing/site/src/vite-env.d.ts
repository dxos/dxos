//
// Copyright 2026 DXOS.org
//

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Overrides https://app.drawing.sh as the share target, to try the button against a local drawing app. */
  readonly VITE_DRAWING_APP_URL?: string;
}
