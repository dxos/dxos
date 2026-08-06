//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SearchOperation from '../types/SearchOperation';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy([
  SearchOperation.OpenSearch.pipe(Operation.lazyHandler(() => import('./open-search'))),
]);
