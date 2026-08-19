//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Plugin from '@dxos/app-framework/Plugin';

import { meta as pluginMeta } from '#meta';
import type { DeckCapabilities } from '#types';

/** Plugin metadata, available without loading the plugin body. */
export const meta = pluginMeta;

/** Constructs the plugin; the body loads on first enable. */
export const make = Plugin.lazy<DeckCapabilities.DeckPluginOptions>(meta, () => import('#plugin'));

/** Re-exported so callers can reference options without importing `#types` directly. */
export type DeckPluginOptions = DeckCapabilities.DeckPluginOptions;
