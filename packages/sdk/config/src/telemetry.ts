//
// Copyright 2026 DXOS.org
//

import { isNode } from '@dxos/util';

import { type Config } from './config';

/**
 * Resolves the telemetry tag used as the `X-DXOS-Client-Tag` header on edge
 * requests AND as the `ctx.tag` attribute / resource on observability traces.
 *
 * Keeping a single resolver ensures the same tag identifies a session across
 * edge and telemetry tiers. Precedence:
 *
 *   1. `config.runtime.app.env.DX_TELEMETRY_TAG` — the explicit, deterministic
 *      path. Populated from `.env`/build-time by the app's config loaders.
 *   2. `process.env.DX_TELEMETRY_TAG` — Node-only, for dev/CI convenience.
 *
 * Returns `undefined` when unset; callers should no-op on undefined rather
 * than stamping empty strings.
 */
export const resolveTelemetryTag = (config?: Config): string | undefined => {
  return config?.get('runtime.app.env.DX_TELEMETRY_TAG') ?? (isNode() ? process.env.DX_TELEMETRY_TAG : undefined);
};
