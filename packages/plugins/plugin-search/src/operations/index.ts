//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as SearchOperation from '../types/SearchOperation';

export const SearchOperationHandlerSet = OperationHandlerSet.keyed([
  [SearchOperation.OpenSearch, () => import('./open-search')],
]);
