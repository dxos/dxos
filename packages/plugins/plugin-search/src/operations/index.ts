//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { SearchOperation } from '../types';

export const SearchOperationHandlerSet = OperationHandlerSet.keyed([
  [SearchOperation.OpenSearch, () => import('./open-search')],
]);
