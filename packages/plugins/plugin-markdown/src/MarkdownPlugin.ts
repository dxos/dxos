//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Plugin from '@dxos/app-framework/Plugin';
import descriptor from '@dxos/plugin-markdown/dxplugin.jsonc';

import { meta as pluginMeta } from '#meta';
import { platform } from '#platform';

/** Plugin metadata, available without loading any module body. */
export const meta = pluginMeta;

/**
 * The plugin, built from its serialized entrypoint. `platform` resolves through the package's own
 * export conditions, which is what narrows the descriptor to the modules a host can actually load.
 */
export const make = Plugin.fromManifest(descriptor, { platform });

export default make;
