//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as SearchOperation from './definitions';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy(() => import('./open-search'));
