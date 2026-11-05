//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

/** The plugin's identity; a leaf, so `dx.config.ts` and the capability tags both derive from it. */
export const CodeNamespace = Plugin.namespace('org.dxos.plugin.code');

/** The plugin's hue, here so its types can carry it without importing the plugin definition and every module it loads. */
export const CODE_HUE = 'indigo';
