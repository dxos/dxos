//
// Copyright 2021 DXOS.org
//

import type { Plugin } from 'esbuild';

/**
 * Some odd path resolution in memdown package.
 */
export function FixMemdownPlugin (): Plugin {
  return {
    name: 'fix-memdown-plugin',
    setup ({ onResolve }) {
      onResolve({ filter: /^immediate$/ }, arg => {
        return {
          path: require.resolve(arg.path, { paths: [arg.resolveDir] })
        };
      });
    }
  };
}
