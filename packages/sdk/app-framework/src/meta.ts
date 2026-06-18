//
// Copyright 2026 DXOS.org
//

import { type Plugin } from './core';

/**
 * Type of the virtual `#meta` module that plugins import. The runtime value is derived from the
 * plugin's `dx.config.ts` (`Plugin.getMetaFromConfig`), so this module declares the type only and
 * emits no runtime value — it exists purely as the target that plugins point their `#meta` `types`
 * condition at, letting `import { meta } from '#meta'` type-check with no per-plugin stub or tsconfig wiring.
 */
export declare const meta: Plugin.Meta;
