//
// Copyright 2026 DXOS.org
//

import { type Plugin } from './core';

/**
 * Type of the virtual `#meta` module that plugins import. The runtime value is synthesized from the
 * plugin's `dx.yml` at build time (by the dx-compile esbuild adapter and the composer vite adapter),
 * so this module declares the type only and emits no runtime value — it exists purely as the target
 * that plugins point their `#meta` `types` condition at, letting `import { meta } from '#meta'`
 * type-check with no per-plugin stub or tsconfig wiring.
 */
export declare const meta: Plugin.Meta;
