//
// Copyright 2025 DXOS.org
//

import { meta as pluginMeta } from '#meta';
import { PreviewPlugin } from '#plugin';

/** Plugin metadata, available without loading the plugin body. */
export const meta = pluginMeta;

/**
 * Constructs the plugin. Eager by design, unlike the lazy `make` on `PreviewPlugin`: storybook runs
 * under vite-dev, where webkit cannot reliably settle the lazy stub's dynamic import (see
 * `@dxos/plugin-testing/src/core.ts`).
 */
export const make = PreviewPlugin;
