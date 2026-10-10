//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as AgentOperation from '../types/AgentOperation.ts';

export const AgentHandlers = OperationHandlerSet.lazy([
  AgentOperation.RunInstructions.pipe(Operation.lazyHandler(() => import('./run-instructions.ts'))),
]);
