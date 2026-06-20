//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';

import config from '../dx.config';

/**
 * Plugin metadata derived from `dx.config.ts`. The DXOS-internal `#meta` convention: a real source
 * module (resolved via the package's `imports#meta` `source` condition) that maps the authored
 * config to a runtime `Plugin.Meta`, replacing the build-time `#meta` synthesis.
 */
export const meta = Plugin.getMetaFromConfig(config);
