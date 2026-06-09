//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'esbuild';
import { join } from 'node:path';

import { readPluginMeta, synthesizePluginMetaSource } from './plugin-meta.ts';

// A virtual entry placed inside the package's `src/` so esbuild treats its own
// bare imports (`@dxos/app-framework`, `@dxos/keys`) like any other source file —
// the existing externalization plugins then apply. The file need not exist on
// disk: `onLoad` supplies its contents.
const VIRTUAL_BASENAME = '__generated_plugin_meta__.ts';

/**
 * Resolves the `#meta` package import to a module synthesized from the package's
 * `dx.yml` (`package.plugins[0]`), so plugin metadata lives in config rather than
 * a hand-written `src/meta.ts`. Packages without a `dx.yml` plugin entry fall
 * through to their own `#meta` resolution.
 */
export const pluginMetaPlugin = (packageDir: string): Plugin => {
  const virtualPath = join(packageDir, 'src', VIRTUAL_BASENAME);
  return {
    name: 'dxos-plugin-meta',
    setup: ({ onResolve, onLoad }) => {
      onResolve({ filter: /^#meta$/ }, () => {
        const plugin = readPluginMeta(packageDir);
        return plugin ? { path: virtualPath } : undefined;
      });

      onLoad({ filter: new RegExp(`${VIRTUAL_BASENAME}$`) }, () => {
        const plugin = readPluginMeta(packageDir);
        if (!plugin) {
          return undefined;
        }
        return { contents: synthesizePluginMetaSource(plugin), loader: 'ts' };
      });
    },
  };
};
