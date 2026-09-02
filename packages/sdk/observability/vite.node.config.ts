//
// Copyright 2026 DXOS.org
//

import { type Plugin } from 'vite';

import { defineConfig } from '../../../vite.base.config.ts';

const base = defineConfig({ entry: 'src/index.ts', outDir: 'dist/lib-node' });

/**
 * The same package, resolved for node.
 *
 * `browser` in `resolve.mainFields` is what applies this package's `browser` field, which swaps the
 * storage and OTel-traces modules for their browser halves — so dropping it is what makes the node
 * halves reachable by a node host. Declarations are emitted by the default build, not again here.
 */
export default {
  ...base,
  plugins: (base.plugins as Plugin[]).filter((plugin) => plugin?.name !== 'DxDeclarations'),
  resolve: { mainFields: ['module', 'jsnext:main', 'jsnext'] },
};
