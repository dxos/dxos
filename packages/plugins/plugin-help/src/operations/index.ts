//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export const HelpOperationHandlerSet = OperationHandlerSet.lazy(() => import('./start'));
