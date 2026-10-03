//
// Copyright 2026 DXOS.org
//

import { resolve as resolvePath } from 'node:path';
import { ResolverFactory } from 'oxc-resolver';

import type { Resolve } from './common.ts';

/**
 * oxc resolver over the repository, with the extension set the indexer walks.
 *
 * `resolveFileSync` rather than `sync`: it takes the importing *file* and discovers the enclosing
 * `tsconfig.json` by walking up from it, so an import that resolves through
 * `compilerOptions.paths` binds. `sync` takes a directory and discovers no tsconfig at all, which
 * left those edges missing from the index entirely.
 */
export const createResolver = (root: string): Resolve => {
  const factory = new ResolverFactory({
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    conditionNames: ['source', 'import', 'default'],
    tsconfig: 'auto',
  });
  return (fromFile, specifier) => factory.resolveFileSync(resolvePath(root, fromFile), specifier).path;
};
