//
// Copyright 2025 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { RunInstructions } from './definitions';

export * from './definitions';

export const AgentHandlers = OperationHandlerSet.keyed([[RunInstructions, () => import('./run-instructions')]]);
