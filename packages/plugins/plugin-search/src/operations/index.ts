//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SearchOperation } from '#types';

import openSearch from './open-search.ts';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy([
  // Bundled with the set: search opens on a keystroke, which must not wait on this handler's chunk.
  SearchOperation.OpenSearch.pipe(Operation.lazyHandler(async () => ({ default: openSearch }))),
]);
