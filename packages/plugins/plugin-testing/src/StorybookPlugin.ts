//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import { StorybookPlugin } from '#plugin';

import { meta as pluginMeta } from './meta';

/** Plugin metadata, available without loading the plugin body. */
export const meta = pluginMeta;

/**
 * Constructs the plugin. Eager by design: storybook runs under vite-dev, where webkit
 * cannot reliably settle the lazy stub's dynamic import (see `./core.ts`).
 */
export const make = StorybookPlugin;

export type { StorybookPluginOptions } from '#plugin';
