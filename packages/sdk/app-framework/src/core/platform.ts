//
// Copyright 2026 DXOS.org
//

import { type Config2 } from '@dxos/protocols';

/**
 * The platform this code is running on, so a descriptor's `platforms` filter needs nothing from the
 * plugin — a plugin declares which modules a platform can load, not which platform it is on.
 *
 * Ordered by how forgeable each signal is. `window` is last because test environments and browser
 * shims both define it, so it identifies nothing on its own; `process.versions.node` is only ever
 * set by a real node or bun runtime, and workerd is named outright by its own user agent.
 */
export const currentPlatform = (): Config2.Platform => {
  if (globalThis.navigator?.userAgent === 'Cloudflare-Workers') {
    return 'workerd';
  }
  if (typeof globalThis.process?.versions?.node === 'string') {
    return 'node';
  }
  return 'browser';
};
