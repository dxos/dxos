//
// Copyright 2026 DXOS.org
//

import { resolve as resolvePath } from 'node:path';
import { ResolverFactory } from 'oxc-resolver';

import type { Resolve } from './common.ts';

/** oxc resolver over the repository, with the extension set the indexer walks. */
export const createResolver = (root: string): Resolve => {
  const factory = new ResolverFactory({
    extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
    conditionNames: ['source', 'import', 'default'],
  });
  return (fromFile, specifier) => factory.sync(resolvePath(root, fromFile, '..'), specifier).path;
};
