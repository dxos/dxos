//
// Copyright 2025 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RunInstructions } from './definitions.ts';

export * from './definitions.ts';

export const AgentHandlers = OperationHandlerSet.lazy([
  RunInstructions.pipe(Operation.lazyHandler(() => import('./run-instructions.ts'))),
]);
