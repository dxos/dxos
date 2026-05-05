//
// Copyright 2025 DXOS.org
//

import type { Operation } from '@dxos/compute';
import { OperationHandlerSet } from '@dxos/compute';

import Sync from './sync';

export const CalendarFunctions: {
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  Sync,
};

export const CalendarHandlers = OperationHandlerSet.lazy(() => import('./sync'));
