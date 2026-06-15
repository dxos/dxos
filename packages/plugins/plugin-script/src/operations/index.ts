//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const ScriptOperationHandlerSet = OperationHandlerSet.lazy(() => import('./create-script'));
