//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { SearchOperation } from '../types';

export const SearchOperationHandlerSet = OperationHandlerSet.keyed([
  [SearchOperation.OpenSearch, () => import('./open-search')],
]);
