//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'vite';

import { defineConfig } from '../../../vite.base.config.ts';
import browserConfig from './vite.config.ts';

const base = defineConfig({ entry: (browserConfig as any).build.lib.entry, outDir: 'dist/lib-node' });

/**
 * The same entrypoints, resolved for node.
 *
 * `browser` in `resolve.mainFields` is what applies this package's `browser` field, which swaps the
 * storage, OTel-traces and PostHog-transport modules for their browser halves — so dropping it is
 * what makes the node halves reachable by a node host. Declarations come from the default build.
 */
export default {
  ...base,
  plugins: (base.plugins as Plugin[]).filter((plugin) => plugin?.name !== 'DxDeclarations'),
  resolve: { mainFields: ['module', 'jsnext:main', 'jsnext'] },
};
