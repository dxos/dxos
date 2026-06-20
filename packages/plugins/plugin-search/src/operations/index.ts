//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const SearchOperationHandlerSet = OperationHandlerSet.lazy(() => import('./open-search'));
