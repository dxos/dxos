//
// Copyright 2025 DXOS.org
//

import type { Operation } from '@dxos/operation';
import { OperationHandlerSet } from '@dxos/operation';

import Sync from './sync';

export const CalendarFunctions: {
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Sync,
};

export const CalendarHandlers = OperationHandlerSet.lazy(() => import('./sync'));
