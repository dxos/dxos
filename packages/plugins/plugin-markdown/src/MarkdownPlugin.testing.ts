//
// Copyright 2025 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';

import * as Capabilities from '#capabilities';
import { meta as pluginMeta } from '#meta';

/** Plugin metadata, available without loading the plugin body. */
export const meta = pluginMeta;

/**
 * Constructs the plugin. Eager by design, unlike the lazy `make` on `MarkdownPlugin`: storybook runs
 * under vite-dev, where webkit cannot reliably settle the lazy stub's dynamic import (see
 * `@dxos/plugin-testing/src/core.ts`).
 */
export const make = Plugin.fromCapabilities(meta, Capabilities);
