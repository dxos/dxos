//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const NavTreeOperationHandlerSet = OperationHandlerSet.lazy(() => import('./expose'));
