//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export const NavTreeOperationHandlerSet = OperationHandlerSet.lazy(() => import('./expose'));
