//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * as SearchOperation from './definitions';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy(() => import('./open-search'));
