//
// Copyright 2025 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * as HelpOperation from './definitions';

export const HelpOperationHandlerSet = OperationHandlerSet.lazy(() => import('./start'));
