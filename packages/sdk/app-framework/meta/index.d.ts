//
// Copyright 2026 DXOS.org
//

import { type Plugin } from '@dxos/app-framework';

/**
 * Type of the virtual `#meta` module that plugins import. The runtime value is
 * synthesized from the plugin's `dx.yml` at build time (by the dx-compile esbuild
 * adapter and the composer vite adapter). Plugins point the `types` condition of
 * their `#meta` import at `@dxos/app-framework/meta`, so `import { meta } from '#meta'`
 * type-checks without a per-plugin stub or any tsconfig wiring.
 */
export declare const meta: Plugin.Meta;
