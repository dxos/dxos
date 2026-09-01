//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SearchOperation } from '#types';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy([
  SearchOperation.OpenSearch.pipe(Operation.lazyHandler(() => import('./open-search.ts'))),
]);
