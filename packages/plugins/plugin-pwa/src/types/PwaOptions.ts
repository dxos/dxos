//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

export type PwaPluginOptions = {
  /** Registers the offline service worker (precache and updates); off where the build ships none. Default true. */
  offline?: boolean;
  /** URL of the host's push-only service worker script; push is unsupported without one. */
  pushWorker?: string;
};
