//
// Copyright 2024 DXOS.org
//

import { OperationHandlerSet } from '@dxos/operation';

export * from './definitions';

export const ThreadHandlers = OperationHandlerSet.lazy(() => import('./create-proposals'));
