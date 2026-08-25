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
export const make = Plugin.fromManifest(descriptor, {
  // The package root, so a host that reads the descriptor raw — bun-compiled, no vite loader —
  // resolves its relative `src` values. Ignored on the vite and lib paths, where they are absolute.
  baseUrl: new URL('..', import.meta.url),
  platform,
});

export default make;
