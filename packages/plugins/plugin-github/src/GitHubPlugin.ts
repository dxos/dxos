//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta as pluginMeta } from '#meta';

/** Plugin metadata, available without loading the plugin body. */
export const meta = pluginMeta;

/** Constructs the plugin; the body loads on first enable. */
export const make = Plugin.lazy(meta, () => import('#plugin'));
