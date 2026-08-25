//
// Copyright 2026 DXOS.org
//

import type * as Plugin from '@dxos/app-framework/Plugin';

/** Browser default; the node and workerd conditions resolve to their own siblings. */
export const platform: NonNullable<Plugin.FromManifestOptions['platform']> = 'browser';
