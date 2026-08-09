//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RunInstructions } from './definitions';

export * from './definitions';

export const AgentHandlers = OperationHandlerSet.lazy([
  RunInstructions.pipe(Operation.lazyHandler(() => import('./run-instructions'))),
]);
