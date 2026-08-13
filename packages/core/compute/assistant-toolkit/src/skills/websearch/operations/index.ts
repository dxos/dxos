//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { Fetch } from './definitions';

export * as WebSearchOperations from './definitions';

export const WebSearchHandlers = OperationHandlerSet.lazy([Fetch.pipe(Operation.lazyHandler(() => import('./fetch')))]);
