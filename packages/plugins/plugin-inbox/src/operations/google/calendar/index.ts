//
// Copyright 2025 DXOS.org
//

import { type Operation, OperationHandlerSet } from '@dxos/compute';

import List from './list';
import Sync from './sync';

export const CalendarFunctions: {
  List: Operation.WithHandler<Operation.Definition.Any>;
  Sync: Operation.WithHandler<Operation.Definition.Any>;
} = {
  List,
  Sync,
};

export const CalendarHandlers = OperationHandlerSet.lazy(
  () => import('./list'),
  () => import('./sync'),
);
